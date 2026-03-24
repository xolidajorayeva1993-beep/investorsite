import { NextRequest, NextResponse } from "next/server";
import { aggregateAllStats } from "@/lib/aggregator";
import { CREATOR_SHARE_PCT, INVESTOR_POOL_PCT } from "@/lib/constants";
import { readPlatformConfig } from "@/lib/platform-config";
import crypto from "crypto";
import * as store from "@/lib/store";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();
    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "Login va parol kiritilmagan" }, { status: 400 });
    }

    const cleanLogin = login.replace(/\s+/g, "");

    const appData = await store.findOne("applications", "phone", cleanLogin);
    if (!appData) {
      return NextResponse.json({ ok: false, error: "Ariza topilmadi. Login yoki parolni tekshiring." }, { status: 404 });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    if (appData.passwordHash && appData.passwordHash !== passwordHash) {
      return NextResponse.json({ ok: false, error: "Parol noto''g''ri." }, { status: 401 });
    }

    const [allApps, withdrawalsAll, transactionsAll, deductions, cfg] = await Promise.all([
      store.getAll("applications"),
      store.getAll("withdrawals"),
      store.getAll("transactions"),
      store.getConfig("config", "deductions", { taxPercent: 12, commissionPercent: 2, serverCostPercent: 3, otherPercent: 0 }),
      readPlatformConfig(),
    ]);

    const activeApps = allApps.filter((a: any) => a.status === "active");
    const totalInvested = activeApps.reduce((s: number, a: any) => s + (Number(a.investmentAmountUzs) || 0), 0);
    const investorCount = activeApps.length;

    const myInvestment = Number(appData.investmentAmountUzs) || 0;
    const poolSharePct = totalInvested > 0 ? (myInvestment / totalInvested) * INVESTOR_POOL_PCT : 0;

    let platformStats = null;
    let projects: any[] = [];
    if (appData.status === "active") {
      try {
        const allStats = await aggregateAllStats();
        platformStats = allStats;
        projects = cfg.projects.map((p: any) => {
          const ps = allStats.projects.find((s: any) => s.key === p.key);
          const monthlyRevenueUzs = Math.round((ps?.stats?.monthlyRevenueUsd || 0) * (Number(process.env.USD_UZS_RATE) || 12700));
          return {
            key: p.key,
            name: p.name,
            state: ps?.stats?.state ?? (ps?.error ? "not_connected" : "offline"),
            monthlyRevenueUzs,
            activeClients: Number(ps?.stats?.activePayingClients) || 0,
            newClients30d: Number(ps?.stats?.newClients30d) || 0,
            syncEventsToday: Number(ps?.stats?.syncEventsToday) || 0,
            lastSync: ps?.stats?.lastSync || null,
            freeUsers: Number(ps?.stats?.freeUsers) || 0,
            paidUsers: Number(ps?.stats?.paidUsers) || 0,
            dailyRevenue: Math.round(monthlyRevenueUzs / 30),
            weeklyRevenue: Math.round(monthlyRevenueUzs / 4),
            totalRevenue: monthlyRevenueUzs * 12,
          };
        });
      } catch { /* ignore stats errors */ }
    }

    const monthlyRevenueUzs = Number(platformStats?.totals?.monthlyRevenueUzs) || 0;
    const monthlyProfit = Math.round(monthlyRevenueUzs * (poolSharePct / 100));
    const yearlyProfit = monthlyProfit * 12;

    const totalDeductionPct =
      (Number(deductions.taxPercent) || 0) +
      (Number(deductions.commissionPercent) || 0) +
      (Number(deductions.serverCostPercent) || 0) +
      (Number(deductions.otherPercent) || 0);
    const netMonthlyRevenue = Math.round(monthlyRevenueUzs * (1 - totalDeductionPct / 100));
    const netMonthlyProfit = Math.round(netMonthlyRevenue * (poolSharePct / 100));
    const netYearlyProfit = netMonthlyProfit * 12;

    const withdrawals = withdrawalsAll.filter((w: any) => w.investorId === appData.id);
    const transactions = transactionsAll.filter((t: any) => t.investorId === appData.id);
    const totalWithdrawn = withdrawals
      .filter((w: any) => w.status === "completed")
      .reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0);

    const campaignTarget = Number(cfg.campaignTargetUzs) || 500_000_000;
    const campaignProgress = campaignTarget > 0 ? Math.min(100, (totalInvested / campaignTarget) * 100) : 0;

    const now = new Date();
    const nextDistributionDate = new Date(
      now.getDate() >= 25 ? now.getFullYear() : now.getFullYear(),
      now.getDate() >= 25 ? now.getMonth() + 1 : now.getMonth(),
      25
    ).toISOString();

    return NextResponse.json({
      ok: true,
      data: {
        id: appData.id,
        fullName: appData.fullName,
        phone: appData.phone,
        email: appData.email,
        passportSeries: appData.passportSeries || "",
        passportNumber: appData.passportNumber || "",
        address: appData.address,
        status: appData.status,
        investmentAmountUzs: myInvestment,
        balance: Number(appData.balance) || 0,
        poolSharePct,
        sharePercent: poolSharePct,
        totalInvested,
        investorCount,
        campaignTarget: campaignTarget,
        campaignTargetUzs: campaignTarget,
        campaignProgress,
        monthlyRevenueUzs,
        monthlyProfit,
        yearlyProfit,
        creatorSharePct: CREATOR_SHARE_PCT,
        investorPoolPct: INVESTOR_POOL_PCT,
        projects,
        totalWithdrawn,
        availableBalance: Number(appData.balance) || 0,
        withdrawals,
        transactions,
        canWithdraw: (Number(appData.balance) || 0) > 0,
        nextDistributionDate,
        estimatedMonthlyProfit: netMonthlyProfit,
        deductions,
        totalDeductionPct,
        netMonthlyRevenue,
        netMonthlyProfit,
        netYearlyProfit,
        expenses: [],
        totalExpensesAmount: 0,
        totalDistributed: 0,
        lastDistributionMonth: "",
        contractId: appData.contractId,
        contractHash: appData.contractHash,
        contractSignedAt: appData.contractSignedAt,
        videoConfirmed: appData.videoConfirmed,
        createdAt: appData.createdAt,
        approvedAt: appData.approvedAt,
        paymentUploadedAt: appData.paymentUploadedAt,
        activatedAt: appData.activatedAt,
        adminRequisites: appData.adminRequisites,
        adminContactInfo: appData.adminContactInfo,
        adminNote: appData.adminNote,
        paymentReceiptFile: appData.paymentReceiptFile,
        paymentReceiptUrl: appData.paymentReceiptUrl,
        rejectionReason: appData.rejectionReason,
        platformStats,
      },
    });
  } catch (err) {
    console.error("Status xatosi:", err);
    return NextResponse.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
