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

    const allApps = await store.getAll("applications");
    const activeApps = allApps.filter((a: any) => a.status !== "rejected");
    const totalInvested = activeApps.reduce((s: number, a: any) => s + (Number(a.investmentAmountUzs) || 0), 0);

    const myInvestment = Number(appData.investmentAmountUzs) || 0;
    const mySharePct = totalInvested > 0 ? (myInvestment / totalInvested) * INVESTOR_POOL_PCT : 0;

    let platformStats = null;
    let myProjectShares = null;
    if (appData.status === "active") {
      try {
        const [cfg, allStats] = await Promise.all([readPlatformConfig(), aggregateAllStats()]);
        platformStats = allStats;
        myProjectShares = cfg.projects.map((p: any) => {
          const ps = allStats.projects.find((s: any) => s.key === p.key);
          return {
            key: p.key, name: p.name, icon: p.icon, gradient: p.gradient,
            url: p.url, tagline: p.tagline, state: ps?.stats?.state ?? (ps?.error ? "not_connected" : "offline"),
            monthlyRevenueUsd: ps?.stats?.monthlyRevenueUsd ?? 0,
            myEstimatedShare: ps?.stats
              ? Math.round((ps.stats.monthlyRevenueUsd * (Number(process.env.USD_UZS_RATE) || 12700)) * (mySharePct / 100) * (CREATOR_SHARE_PCT / 100))
              : 0,
          };
        });
      } catch { /* ignore stats errors */ }
    }

    const { campaignTargetUzs } = await readPlatformConfig();

    return NextResponse.json({
      ok: true,
      data: {
        id: appData.id,
        fullName: appData.fullName,
        phone: appData.phone,
        email: appData.email,
        address: appData.address,
        status: appData.status,
        investmentAmountUzs: myInvestment,
        balance: Number(appData.balance) || 0,
        sharePercent: mySharePct,
        totalInvested,
        campaignTargetUzs,
        contractId: appData.contractId,
        contractHash: appData.contractHash,
        contractSignedAt: appData.contractSignedAt,
        videoConfirmed: appData.videoConfirmed,
        createdAt: appData.createdAt,
        approvedAt: appData.approvedAt,
        activatedAt: appData.activatedAt,
        adminRequisites: appData.adminRequisites,
        adminContactInfo: appData.adminContactInfo,
        adminNote: appData.adminNote,
        paymentReceiptFile: appData.paymentReceiptFile,
        paymentReceiptUrl: appData.paymentReceiptUrl,
        rejectionReason: appData.rejectionReason,
        platformStats,
        myProjectShares,
      },
    });
  } catch (err) {
    console.error("Status xatosi:", err);
    return NextResponse.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
