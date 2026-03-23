import { NextResponse } from "next/server";
import { aggregateAllStats } from "@/lib/aggregator";
import { readPlatformConfig } from "@/lib/platform-config";
import type { FundraisingStatus } from "@/lib/types";
import * as store from "@/lib/store";

export const dynamic = "force-dynamic";

type FooterSettings = {
  brandName: string;
  legalEntity: string;
  address: string;
  email: string;
  phone: string;
  workingHours: string;
  termsUrl: string;
  privacyUrl: string;
  telegramUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  facebookUrl: string;
  xUrl: string;
  linkedinUrl: string;
};

const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  brandName: "FathGroup",
  legalEntity: "FathGroup Investor Platform",
  address: "Toshkent, O'zbekiston",
  email: "support@fathgroup.uz",
  phone: "+998 93 585 05 07",
  workingHours: "Dushanba - Juma, 09:00 - 18:00",
  termsUrl: "/terms",
  privacyUrl: "/privacy",
  telegramUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  facebookUrl: "",
  xUrl: "",
  linkedinUrl: "",
};

/** Barcha 4 loyixa statistikasi + fundraising holati */
export async function GET() {
  try {
    const [stats, allApps, platformConfig, ownerSettings] = await Promise.all([
      aggregateAllStats(),
      store.getAll("applications"),
      readPlatformConfig(),
      store.getConfig<Record<string, unknown>>("config", "owner_settings", {}),
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

    const rawFooter = ownerSettings?.footer;
    const footerOverrides = (rawFooter && typeof rawFooter === "object")
      ? (rawFooter as Partial<FooterSettings>)
      : {};
    const footerSettings: FooterSettings = {
      ...DEFAULT_FOOTER_SETTINGS,
      ...footerOverrides,
    };

    return NextResponse.json({ success: true, stats, fundraising, footerSettings });
  } catch (err) {
    console.error("Hub stats xatosi:", err);
    return NextResponse.json(
      { success: false, error: "Ma'lumotlarni yuklashda xatolik" },
      { status: 500 }
    );
  }
}
