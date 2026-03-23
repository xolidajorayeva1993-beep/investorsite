import { NextResponse } from "next/server";
import { aggregateAllStats } from "@/lib/aggregator";
import { readPlatformConfig } from "@/lib/platform-config";
import type { FundraisingStatus } from "@/lib/types";
import * as store from "@/lib/store";

export const dynamic = "force-dynamic";

/** Barcha 4 loyixa statistikasi + fundraising holati */
export async function GET() {
  try {
    const [stats, allApps, platformConfig] = await Promise.all([
      aggregateAllStats(),
      store.getAll("applications"),
      readPlatformConfig(),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeInvestors = allApps.filter((a: any) => a.status === "active");

    let currentCapital = 0;
    activeInvestors.forEach((a: Record<string, unknown>) => {
      currentCapital += Number(a.investmentAmountUzs) || 0;
    });

    const { campaignTargetUzs } = platformConfig;
    const remaining = Math.max(0, campaignTargetUzs - currentCapital);

    const fundraising: FundraisingStatus = {
      targetCapitalUzs: campaignTargetUzs,
      currentCapitalUzs: currentCapital,
      remainingCapitalUzs: remaining,
      investorCount: activeInvestors.length,
      acceptingInvestors: currentCapital < campaignTargetUzs,
      progressPct: campaignTargetUzs > 0
        ? Math.round((currentCapital / campaignTargetUzs) * 100)
        : 0,
    };

    return NextResponse.json({ success: true, stats, fundraising });
  } catch (err) {
    console.error("Hub stats xatosi:", err);
    return NextResponse.json(
      { success: false, error: "Ma'lumotlarni yuklashda xatolik" },
      { status: 500 }
    );
  }
}
