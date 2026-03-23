import { NextRequest, NextResponse } from "next/server";
import { INVESTOR_POOL_PCT } from "@/lib/constants";
import * as store from "@/lib/store";
import { db } from "@/lib/firebase-admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEFAULT_DEDUCTIONS = { taxPercent: 12, commissionPercent: 2, serverCostPercent: 3, otherPercent: 0 };

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret") || "";
  const adminSecret = process.env.ADMIN_SECRET || "";
  const isAutoTrigger = cronSecret === "auto";
  if (!isAutoTrigger && (!adminSecret || cronSecret !== adminSecret)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const now = new Date();
  const day = now.getDate();
  const hour = now.getHours();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const force = req.nextUrl.searchParams.get("force") === "true";
  if (!force && (day < 25 || hour < 8)) {
    return NextResponse.json({ ok: false, message: "Hali vaqti kelmadi. 25-sanasi soat 08:00 dan keyin taqsimlanadi.", day, hour });
  }

  const distributionLog = await store.getConfig("config", "distribution_log", {});
  if (!force && (distributionLog as any)[monthKey]) {
    return NextResponse.json({
      ok: false,
      message: `${monthKey} oyi uchun foyda allaqachon taqsimlangan`,
      lastDistribution: (distributionLog as any)[monthKey],
    });
  }

  let monthlyRevenue = 0;
  try {
    const { aggregateAllStats } = await import("@/lib/aggregator");
    const { USD_UZS_RATE } = await import("@/lib/constants");
    const stats = await aggregateAllStats();
    monthlyRevenue = stats.totals.monthlyRevenueUzs || Math.round(stats.totals.monthlyRevenueUsd * USD_UZS_RATE);
  } catch {
    return NextResponse.json({ error: "Loyiha statistikalarini olishda xatolik" }, { status: 500 });
  }

  if (monthlyRevenue <= 0) {
    return NextResponse.json({ ok: false, message: "Oylik daromad 0 yoki mavjud emas", monthlyRevenue });
  }

  const apps = await store.getAll("applications");
  const activeApps = apps.filter((a: any) => a.status === "active");
  if (activeApps.length === 0) {
    return NextResponse.json({ ok: false, message: "Faol investorlar yo'q" });
  }

  const ded = await store.getConfig("config", "deductions", { ...DEFAULT_DEDUCTIONS });
  const totalDeductionPct = (Number(ded.taxPercent) || 0) + (Number(ded.commissionPercent) || 0) + (Number(ded.serverCostPercent) || 0) + (Number(ded.otherPercent) || 0);
  const netRevenue = Math.round(monthlyRevenue * (1 - totalDeductionPct / 100));
  const investorPool = Math.round(netRevenue * INVESTOR_POOL_PCT / 100);
  const creatorShare = netRevenue - investorPool;

  const eligibleApps = activeApps.filter((a: any) => !a.profitEligibleFrom || new Date(a.profitEligibleFrom) <= now);
  const totalEligibleInvested = eligibleApps.reduce((s: number, a: any) => s + (Number(a.investmentAmountUzs) || 0), 0);

  if (totalEligibleInvested <= 0) {
    return NextResponse.json({ ok: false, message: "Foyda olish huquqiga ega investorlar yo'q" });
  }

  const distributions: any[] = [];
  const distributionDate = now.toISOString();
  const batch = db.batch();

  for (const app of eligibleApps) {
    const sharePct = (Number(app.investmentAmountUzs) || 0) / totalEligibleInvested;
    const profitAmount = Math.round(investorPool * sharePct);
    if (profitAmount <= 0) continue;
    const txId = `TX-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4)}`;
    batch.update(db.collection("applications").doc(app.id), {
      balance: (Number(app.balance) || 0) + profitAmount, _updatedAt: distributionDate,
    });
    batch.set(db.collection("transactions").doc(txId), {
      id: txId, investorId: app.id, type: "profit", amount: profitAmount,
      description: `Avtomatik oylik foyda  ${monthKey}  ${(sharePct * INVESTOR_POOL_PCT).toFixed(2)}% ulush`,
      createdAt: distributionDate, _createdAt: distributionDate, _updatedAt: distributionDate,
    });
    distributions.push({ investorId: app.id, phoneLast4: (app.phone || "").slice(-4), amount: profitAmount, sharePct: sharePct * 100 });
  }

  const logEntry = { distributedAt: distributionDate, monthlyRevenue, totalDeductionPct, netRevenue, investorPool, creatorShare, investorCount: distributions.length, distributions };
  const updatedLog = { ...(distributionLog as any), [monthKey]: logEntry };

  const notifId = `NOTIF-${Date.now().toString(36).toUpperCase()}`;
  batch.set(db.collection("notifications").doc(notifId), {
    id: notifId, type: "profit_distributed", title: "Oylik foyda avtomatik taqsimlandi",
    message: `${monthKey} oyi: ${monthlyRevenue.toLocaleString()} so'm  Chegirmalar ${totalDeductionPct}%  Toza ${netRevenue.toLocaleString()}  Investorlar ${investorPool.toLocaleString()} so'm (${distributions.length} kishi)`,
    createdAt: distributionDate, readBy: [], _createdAt: distributionDate, _updatedAt: distributionDate,
  });
  await batch.commit();
  await store.setConfig("config", "distribution_log", updatedLog);

  return NextResponse.json({
    ok: true, message: `Avtomatik foyda taqsimlandi: ${monthKey}`,
    data: { monthKey, monthlyRevenue, totalDeductionPct, netRevenue, investorPool, creatorShare, investorCount: distributions.length, distributions },
  });
}
