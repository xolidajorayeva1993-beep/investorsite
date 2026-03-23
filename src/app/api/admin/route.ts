import { NextRequest, NextResponse } from "next/server";
import { INVESTOR_POOL_PCT } from "@/lib/constants";
import { readPlatformConfig, writePlatformConfig, generateProjectKey } from "@/lib/platform-config";
import type { ProjectConfig } from "@/lib/platform-config";
import * as store from "@/lib/store";
import { db } from "@/lib/firebase-admin";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const VALID_STATUSES = ["pending", "approved", "payment_uploaded", "active", "rejected"];
const DEFAULT_DEDUCTIONS = { taxPercent: 12, commissionPercent: 2, serverCostPercent: 3, otherPercent: 0 };

/* eslint-disable @typescript-eslint/no-explicit-any */

function auth(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret") || "";
  return ADMIN_SECRET.length > 0 && secret === ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });

  const [applications, withdrawals, transactions, expenses, notifications, deductions, ownerSettings, platformConfig] = await Promise.all([
    store.getAll("applications"),
    store.getAll("withdrawals"),
    store.getAll("transactions"),
    store.getAll("expenses"),
    store.getAll("notifications"),
    store.getConfig("config", "deductions", DEFAULT_DEDUCTIONS),
    store.getConfig("config", "owner_settings", {}),
    readPlatformConfig(),
  ]);

  const totalInvested = applications
    .filter((a: any) => a.status === "active")
    .reduce((s: number, a: any) => s + (a.investmentAmountUzs || 0), 0);

  const statusCounts = { pending: 0, approved: 0, payment_uploaded: 0, active: 0, rejected: 0 };
  for (const a of applications) {
    const st = a.status as keyof typeof statusCounts;
    if (st in statusCounts) statusCounts[st]++;
  }

  const investorsList = applications
    .filter((a: any) => a.status === "active")
    .map((a: any) => ({
      phoneLast4: (a.phone || "").slice(-4),
      investmentAmount: Number(a.investmentAmountUzs) || 0,
      sharePercent: totalInvested > 0 ? ((Number(a.investmentAmountUzs) || 0) / totalInvested) * INVESTOR_POOL_PCT : 0,
      balance: Number(a.balance) || 0,
      joinedDate: a.activatedAt || a.createdAt,
    }));

  return NextResponse.json({
    ok: true,
    data: {
      investors: applications, investorsList, withdrawals, transactions,
      expenses: [...expenses].reverse(),
      notifications: notifications.slice(-30).reverse(),
      deductions, ownerSettings, platformConfig,
      summary: {
        totalInvestors: applications.length, totalInvested, statusCounts,
        pendingWithdrawals: withdrawals.filter((w: any) => w.status === "pending").length,
        totalWithdrawn: withdrawals.filter((w: any) => w.status === "completed").reduce((s: number, w: any) => s + (w.amount || 0), 0),
        totalTransactions: transactions.length, totalExpenses: expenses.length,
        votingExpenses: expenses.filter((e: any) => e.status === "voting").length,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  const body = await req.json();
  const { action } = body;

  if (action === "approveInvestor") {
    const { investorId, requisites, contactInfo, adminNote } = body;
    if (!investorId) return NextResponse.json({ error: "ID kerak" }, { status: 400 });
    if (!requisites?.bank || !requisites?.account) return NextResponse.json({ error: "Rekvizitlar to'ldirilmagan" }, { status: 400 });
    const app = await store.getDoc("applications", investorId);
    if (!app) return NextResponse.json({ error: "Investor topilmadi" }, { status: 404 });
    if (app.status !== "pending") return NextResponse.json({ error: "Faqat kutilayotgan arizalarni tasdiqlash mumkin" }, { status: 400 });
    await store.updateFields("applications", investorId, {
      status: "approved", approvedAt: new Date().toISOString(),
      adminRequisites: requisites, adminContactInfo: contactInfo || {}, adminNote: adminNote || "",
    });
    return NextResponse.json({ ok: true, message: "Ariza tasdiqlandi, investor to'lov kutmoqda" });
  }

  if (action === "rejectInvestor") {
    const { investorId, rejectionReason } = body;
    if (!investorId) return NextResponse.json({ error: "ID kerak" }, { status: 400 });
    const app = await store.getDoc("applications", investorId);
    if (!app) return NextResponse.json({ error: "Investor topilmadi" }, { status: 404 });
    await store.updateFields("applications", investorId, {
      status: "rejected", rejectedAt: new Date().toISOString(),
      rejectionReason: rejectionReason || "Sabab ko'rsatilmagan",
    });
    return NextResponse.json({ ok: true, message: "Ariza rad etildi" });
  }

  if (action === "confirmPayment") {
    const { investorId } = body;
    if (!investorId) return NextResponse.json({ error: "ID kerak" }, { status: 400 });
    const app = await store.getDoc("applications", investorId);
    if (!app) return NextResponse.json({ error: "Investor topilmadi" }, { status: 404 });
    if (app.status !== "payment_uploaded") return NextResponse.json({ error: "Faqat chek yuborilgan arizalarni tasdiqlash mumkin" }, { status: 400 });
    const now = new Date();
    const day = now.getDate();
    const profitEligibleFrom = day > 20
      ? new Date(now.getFullYear(), now.getMonth() + 1, 25).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 25).toISOString();
    const txId = `TX-${Date.now().toString(36).toUpperCase()}`;
    const notifId = `NOTIF-${Date.now().toString(36).toUpperCase()}`;
    const nowStr = now.toISOString();
    const batch = db.batch();
    batch.update(db.collection("applications").doc(investorId), {
      status: "active", activatedAt: nowStr, balance: 0,
      profitEligibleFrom, _updatedAt: nowStr,
    });
    batch.set(db.collection("transactions").doc(txId), {
      id: txId, investorId, type: "deposit", amount: app.investmentAmountUzs,
      description: `Dastlabki investitsiya  ${app.fullName}`,
      createdAt: nowStr, _createdAt: nowStr, _updatedAt: nowStr,
    });
    batch.set(db.collection("notifications").doc(notifId), {
      id: notifId, type: "new_investor", title: "Yangi investor qo'shildi",
      message: `Yangi investor ***${(app.phone || "").slice(-4)} ${(app.investmentAmountUzs || 0).toLocaleString()} so'm investitsiya bilan qo'shildi.`,
      createdAt: nowStr, readBy: [], _createdAt: nowStr, _updatedAt: nowStr,
    });
    await batch.commit();
    return NextResponse.json({ ok: true, message: "To'lov tasdiqlandi, investitsiya faol!" });
  }

  if (action === "updateStatus") {
    const { investorId, newStatus } = body;
    if (!investorId || !VALID_STATUSES.includes(newStatus)) return NextResponse.json({ error: "Noto'g'ri parametrlar" }, { status: 400 });
    const app = await store.getDoc("applications", investorId);
    if (!app) return NextResponse.json({ error: "Investor topilmadi" }, { status: 404 });
    await store.updateFields("applications", investorId, { status: newStatus });
    return NextResponse.json({ ok: true, message: `Holat o'zgartirildi: ${newStatus}` });
  }

  if (action === "processWithdrawal") {
    const { withdrawalId, newStatus } = body;
    if (!withdrawalId || !["completed", "rejected"].includes(newStatus)) return NextResponse.json({ error: "Noto'g'ri parametrlar" }, { status: 400 });
    const wd = await store.getDoc("withdrawals", withdrawalId);
    if (!wd) return NextResponse.json({ error: "So'rov topilmadi" }, { status: 404 });
    await store.updateFields("withdrawals", withdrawalId, { status: newStatus, processedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, message: `Yechish so'rovi: ${newStatus}` });
  }

  if (action === "deleteInvestor") {
    const { investorId } = body;
    if (!investorId) return NextResponse.json({ error: "ID kerak" }, { status: 400 });
    const app = await store.getDoc("applications", investorId);
    if (!app) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    await store.deleteDoc("applications", investorId);
    return NextResponse.json({ ok: true, message: "Investor o'chirildi" });
  }

  if (action === "editInvestment") {
    const { investorId, newAmount } = body;
    if (!investorId || newAmount == null || newAmount < 0) return NextResponse.json({ error: "Noto'g'ri parametrlar" }, { status: 400 });
    const app = await store.getDoc("applications", investorId);
    if (!app) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    await store.updateFields("applications", investorId, { investmentAmountUzs: newAmount });
    return NextResponse.json({ ok: true, message: `Investitsiya yangilandi: ${newAmount}` });
  }

  if (action === "createExpense") {
    const { title, description, amount, deadline } = body;
    if (!title || !amount || amount <= 0) return NextResponse.json({ error: "Sarlavha va miqdor kerak" }, { status: 400 });
    const expenseId = `EXP-${Date.now().toString(36).toUpperCase()}`;
    const notifId = `NOTIF-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();
    const batch = db.batch();
    const expTitle = (title as string).trim().slice(0, 200);
    batch.set(db.collection("expenses").doc(expenseId), {
      id: expenseId, title: expTitle,
      description: ((description as string) || "").trim().slice(0, 1000),
      amount: Number(amount), createdAt: now,
      deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "voting", votes: [], _createdAt: now, _updatedAt: now,
    });
    batch.set(db.collection("notifications").doc(notifId), {
      id: notifId, type: "expense_vote", title: "Yangi sarf taklifi",
      message: `Admin yangi sarf kiritdi: "${expTitle}"  ${Number(amount).toLocaleString()} so'm. Ovoz bering!`,
      createdAt: now, readBy: [], _createdAt: now, _updatedAt: now,
    });
    await batch.commit();
    return NextResponse.json({ ok: true, message: "Sarf taklifi yaratildi", data: { id: expenseId } });
  }

  if (action === "completeExpense") {
    const { expenseId } = body;
    if (!expenseId) return NextResponse.json({ error: "Sarf ID kerak" }, { status: 400 });
    const exp = await store.getDoc("expenses", expenseId);
    if (!exp) return NextResponse.json({ error: "Sarf topilmadi" }, { status: 404 });
    if (exp.status !== "approved") return NextResponse.json({ error: "Faqat tasdiqlangan sarflarni bajarish mumkin" }, { status: 400 });
    const txId = `TX-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(db.collection("expenses").doc(expenseId), { status: "completed", completedAt: now, _updatedAt: now });
    batch.set(db.collection("transactions").doc(txId), {
      id: txId, investorId: "FUND", type: "expense", amount: exp.amount,
      description: `Sarf: ${exp.title}`, createdAt: now, _createdAt: now, _updatedAt: now,
    });
    await batch.commit();
    return NextResponse.json({ ok: true, message: "Sarf bajarildi va tranzaksiyaga yozildi" });
  }

  if (action === "updateDeductions") {
    const { taxPercent, commissionPercent, serverCostPercent, otherPercent } = body;
    const ded = await store.getConfig("config", "deductions", { ...DEFAULT_DEDUCTIONS });
    if (taxPercent != null) ded.taxPercent = Math.max(0, Math.min(100, Number(taxPercent)));
    if (commissionPercent != null) ded.commissionPercent = Math.max(0, Math.min(100, Number(commissionPercent)));
    if (serverCostPercent != null) ded.serverCostPercent = Math.max(0, Math.min(100, Number(serverCostPercent)));
    if (otherPercent != null) ded.otherPercent = Math.max(0, Math.min(100, Number(otherPercent)));
    await store.setConfig("config", "deductions", ded);
    return NextResponse.json({ ok: true, message: `Chegirmalar yangilandi: ${ded.taxPercent}% soliq, ${ded.commissionPercent}% komissiya` });
  }

  if (action === "distributeProfit") {
    const { monthlyRevenue } = body;
    if (!monthlyRevenue || monthlyRevenue <= 0) return NextResponse.json({ error: "Oylik daromad miqdori kerak" }, { status: 400 });
    const apps = await store.getAll("applications");
    const activeApps = apps.filter((a: any) => a.status === "active");
    if (activeApps.length === 0) return NextResponse.json({ error: "Faol investorlar yo'q" }, { status: 400 });
    const now = new Date();
    const distributionDate = now.toISOString();
    const ded = await store.getConfig("config", "deductions", { ...DEFAULT_DEDUCTIONS });
    const totalDeductionPct = (Number(ded.taxPercent) || 0) + (Number(ded.commissionPercent) || 0) + (Number(ded.serverCostPercent) || 0) + (Number(ded.otherPercent) || 0);
    const netRevenue = Math.round(monthlyRevenue * (1 - totalDeductionPct / 100));
    const investorPool = Math.round(netRevenue * INVESTOR_POOL_PCT / 100);
    const eligibleApps = activeApps.filter((a: any) => !a.profitEligibleFrom || new Date(a.profitEligibleFrom) <= now);
    const totalEligibleInvested = eligibleApps.reduce((s: number, a: any) => s + (Number(a.investmentAmountUzs) || 0), 0);
    if (totalEligibleInvested <= 0) return NextResponse.json({ error: "Foyda olish huquqiga ega investorlar yo'q" }, { status: 400 });
    const distributions: any[] = [];
    const batch = db.batch();
    for (const app of eligibleApps) {
      const sharePct = (Number(app.investmentAmountUzs) || 0) / totalEligibleInvested;
      const profitAmount = Math.round(investorPool * sharePct);
      if (profitAmount <= 0) continue;
      const txId = `TX-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4)}`;
      batch.update(db.collection("applications").doc(app.id), { balance: (Number(app.balance) || 0) + profitAmount, _updatedAt: distributionDate });
      batch.set(db.collection("transactions").doc(txId), {
        id: txId, investorId: app.id, type: "profit", amount: profitAmount,
        description: `Oylik foyda  ${(sharePct * INVESTOR_POOL_PCT).toFixed(2)}% ulush`,
        createdAt: distributionDate, _createdAt: distributionDate, _updatedAt: distributionDate,
      });
      distributions.push({ investorId: app.id, phoneLast4: (app.phone || "").slice(-4), amount: profitAmount, sharePct: sharePct * 100 });
    }
    const notifId = `NOTIF-${Date.now().toString(36).toUpperCase()}`;
    batch.set(db.collection("notifications").doc(notifId), {
      id: notifId, type: "profit_distributed", title: "Oylik foyda taqsimlandi",
      message: `${new Date().toLocaleDateString("uz-UZ", { month: "long", year: "numeric" })} oyi foyda (${investorPool.toLocaleString()} so'm) ${distributions.length} ta investorga taqsimlandi.`,
      createdAt: distributionDate, readBy: [], _createdAt: distributionDate, _updatedAt: distributionDate,
    });
    await batch.commit();
    return NextResponse.json({
      ok: true, message: `Foyda taqsimlandi: ${netRevenue.toLocaleString()} (toza), investorlar ${investorPool.toLocaleString()}, ${distributions.length} kishi`,
      data: { distributions, totalDistributed: investorPool, netRevenue, totalDeductionPct },
    });
  }

  if (action === "saveOwnerSettings") {
    const { settings } = body;
    if (!settings) return NextResponse.json({ error: "Sozlamalar kiritilmagan" }, { status: 400 });
    await store.setConfig("config", "owner_settings", { ...settings, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, message: "Egasi ma'lumotlari saqlandi" });
  }

  if (action === "savePlatformConfig") {
    const { campaignTargetUzs, projects } = body;
    const current = await readPlatformConfig();
    const newTarget = Number(campaignTargetUzs);
    if (newTarget > 0) current.campaignTargetUzs = newTarget;
    if (Array.isArray(projects)) {
      current.projects = projects.map((p: Partial<ProjectConfig>, i: number) => ({
        key: p.key || generateProjectKey(p.name || `loyiha-${i}`),
        name: (p.name || "").trim(), description: (p.description || "").trim(),
        url: (p.url || "").trim(), statsUrl: (p.statsUrl || "").trim(),
        apiDocsUrl: (p.apiDocsUrl || "").trim(), useEnvFallback: p.useEnvFallback !== false,
        icon: (p.icon || "\uD83D\uDCE6").trim(),
        gradient: (p.gradient || "from-gray-500/10 to-slate-500/10").trim(),
        tagline: (p.tagline || "").trim(), problem: (p.problem || "").trim(),
        solution: (p.solution || "").trim(), audience: (p.audience || "").trim(),
        model: (p.model || "").trim(),
        order: typeof p.order === "number" ? p.order : i, active: p.active !== false,
      }));
    }
    await writePlatformConfig(current);
    return NextResponse.json({ ok: true, message: "Platforma konfiguratsiyasi saqlandi", data: current });
  }

  return NextResponse.json({ error: "Noma'lum action" }, { status: 400 });
}
