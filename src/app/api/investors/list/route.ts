import { NextRequest, NextResponse } from "next/server";
import { INVESTOR_POOL_PCT } from "@/lib/constants";
import crypto from "crypto";
import * as store from "@/lib/store";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Anonim investor ro'yxati — investorlar uchun */
export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();
    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "Avtorizatsiya xatosi" }, { status: 401 });
    }

    const cleanLogin = login.replace(/\s+/g, "");
    const allApps = await store.getAll("applications");
    const me = allApps.find((a: any) => a.phone === cleanLogin);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Investor topilmadi" }, { status: 404 });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    if (me.passwordHash && me.passwordHash !== passwordHash) {
      return NextResponse.json({ ok: false, error: "Parol noto'g'ri" }, { status: 401 });
    }

    const activeInvestors = allApps.filter((a: any) => a.status === "active");
    const totalInvested = activeInvestors.reduce(
      (s: number, a: any) => s + (Number(a.investmentAmountUzs) || 0), 0
    );

    const investors = activeInvestors.map((a: any) => ({
      phoneLast4: (a.phone || "").slice(-4),
      investmentAmount: Number(a.investmentAmountUzs) || 0,
      sharePercent: totalInvested > 0
        ? ((Number(a.investmentAmountUzs) || 0) / totalInvested) * INVESTOR_POOL_PCT
        : 0,
      joinedDate: a.activatedAt || a.createdAt,
      isMe: a.id === me.id,
    }));

    return NextResponse.json({
      ok: true,
      data: { investors, totalInvested, investorCount: activeInvestors.length },
    });
  } catch (err) {
    console.error("Investors list xatosi:", err);
    return NextResponse.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
