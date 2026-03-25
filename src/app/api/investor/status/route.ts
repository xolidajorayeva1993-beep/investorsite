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

    const [allApps, withdrawalsAll, transactionsAll, expensesAll, deductions, cfg] = await Promise.all([
      store.getAll("applications"),
      store.getAll("withdrawals"),
      store.getAll("transactions"),
      store.getAll("expenses"),
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

    const totalFundExpensesAmount = expensesAll
      .filter((e: any) => e.status === "completed")
      .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
    const investorExpenseShareUzs = totalInvested > 0
      ? Math.round(totalFundExpensesAmount * (myInvestment / totalInvested))
      : 0;

    const totalDistributed = transactions
      .filter((t: any) => t.type === "profit")
      .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

    const campaignTarget = Number(cfg.campaignTargetUzs) || 500_000_000;
    const campaignProgress = campaignTarget > 0 ? Math.min(100, (totalInvested / campaignTarget) * 100) : 0;

    // Oxirgi taqsimot ma'lumotlari — distribution_log dan
    const distributionLog = await store.getConfig("config", "distribution_log", {}) as Record<string, any>;
    const logEntries = Object.entries(distributionLog)
      .filter(([k]) => /^\d{4}-\d{2}$/.test(k))
      .sort(([a], [b]) => b.localeCompare(a));
    const lastLogEntry = logEntries.length > 0 ? logEntries[0][1] : null;
    const lastDistributionMonth = logEntries.length > 0 ? logEntries[0][0] : "";
    const myLastDistribution = lastLogEntry
      ? (lastLogEntry.distributions ?? []).find((d: any) => d.investorId === appData.id)
      : null;
    const lastDistributionData = lastLogEntry
      ? {
          monthlyRevenue: lastLogEntry.monthlyRevenue ?? 0,
          netRevenue: lastLogEntry.netRevenue ?? 0,
          investorPool: lastLogEntry.investorPoolDistributed ?? lastLogEntry.plannedInvestorPool ?? 0,
          creatorShare: lastLogEntry.creatorShare ?? 0,
          myAmount: myLastDistribution ? (myLastDistribution.amount ?? 0) : 0,
          mySharePct: myLastDistribution ? (myLastDistribution.sharePct ?? 0) : 0,
          distributedAt: lastLogEntry.distributedAt ?? "",
          investorCount: lastLogEntry.investorCount ?? 0,
        }
      : null;

    const investorNameById = new Map(
      allApps
        .filter((a: any) => !!a.id)
        .map((a: any) => [a.id, a.fullName || `Investor ${(a.phone || "").slice(-4)}`])
    );

    const distributionHistory = logEntries.map(([monthKey, entry]) => {
      const recipients = (entry?.distributions ?? [])
        .map((d: any) => ({
          investorId: d.investorId,
          fullName: investorNameById.get(d.investorId) || `Investor ${(d.phoneLast4 || "")}`,
          phoneLast4: d.phoneLast4 || "",
          amount: Number(d.amount) || 0,
          sharePct: Number(d.sharePct) || 0,
        }))
        .sort((a: any, b: any) => b.amount - a.amount);

      return {
        monthKey,
        distributedAt: entry?.distributedAt || "",
        monthlyRevenue: Number(entry?.monthlyRevenue) || 0,
        netRevenue: Number(entry?.netRevenue) || 0,
        investorPool: Number(entry?.investorPoolDistributed ?? entry?.plannedInvestorPool) || 0,
        creatorShare: Number(entry?.creatorShare) || 0,
        investorCount: Number(entry?.investorCount) || recipients.length,
        recipients,
      };
    });

    // Dashboard uchun taqsimot sanalari UZ vaqt (25-kun 08:00 UZ = 03:00 UTC)
    const uzNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
    const uzDay = uzNow.getDate();
    const uzMonth = uzNow.getMonth(); // 0-based
    const uzYear = uzNow.getFullYear();
    const uzHour = uzNow.getHours();
    const distributionAlreadyRanThisMonth = uzDay > 25 || (uzDay === 25 && uzHour >= 8);

    const currentCycleDistributionDate = distributionAlreadyRanThisMonth
      ? new Date(Date.UTC(uzYear, uzMonth, 25, 3, 0, 0))
      : new Date(Date.UTC(uzYear, uzMonth, 25, 3, 0, 0));

    const nextDistDate = distributionAlreadyRanThisMonth
      ? new Date(Date.UTC(uzMonth === 11 ? uzYear + 1 : uzYear, (uzMonth + 1) % 12, 25, 3, 0, 0))
      : currentCycleDistributionDate;
    const nextDistributionDate = nextDistDate.toISOString();

    // Foyda olishga haqli sana (hozirgi yakunlanayotgan siklga kira oladimi)
    const profitEligibleFrom = appData.profitEligibleFrom ?? null;
    const isEligibleThisCycle = !profitEligibleFrom || new Date(profitEligibleFrom) <= currentCycleDistributionDate;
    const estimatedMonthlyProfit = isEligibleThisCycle ? netMonthlyProfit : 0;

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
        estimatedMonthlyProfit,
        deductions,
        totalDeductionPct,
        netMonthlyRevenue,
        netMonthlyProfit,
        netYearlyProfit,
        expenses: [],
        totalExpensesAmount: investorExpenseShareUzs,
        totalDistributed,
        lastDistributionMonth,
        lastDistributionData,
        distributionHistory,
        profitEligibleFrom,
        isEligibleThisCycle,
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
