import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as store from "@/lib/store";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  try {
    const { login, password, amount, bankName, cardNumber, note } = await req.json();

    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "Avtorizatsiya xatosi" }, { status: 401 });
    }

    const cleanLogin = login.replace(/\s+/g, "");
    const app = await store.findOne("applications", "phone", cleanLogin);
    if (!app) {
      return NextResponse.json({ ok: false, error: "Investor topilmadi" }, { status: 404 });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    if (app.passwordHash && app.passwordHash !== passwordHash) {
      return NextResponse.json({ ok: false, error: "Parol noto'g'ri" }, { status: 401 });
    }

    const withdrawAmount = Number(amount);
    if (!Number.isFinite(withdrawAmount) || withdrawAmount < 10_000) {
      return NextResponse.json({ ok: false, error: "Minimal yechish miqdori 10,000 so'm" }, { status: 400 });
    }

    if (!cardNumber || typeof cardNumber !== "string" || cardNumber.replace(/\s/g, "").length < 16) {
      return NextResponse.json({ ok: false, error: "Karta raqami noto'g'ri" }, { status: 400 });
    }

    const withdrawalId = `WD-${Date.now().toString(36).toUpperCase()}`;
    await store.addDoc("withdrawals", withdrawalId, {
      id: withdrawalId,
      investorId: app.id,
      investorName: app.fullName,
      phone: app.phone,
      amount: withdrawAmount,
      bankName: (bankName || "").trim(),
      cardNumber: cardNumber.replace(/\s/g, ""),
      note: (note || "").trim().slice(0, 200),
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Yechish so'rovi qabul qilindi. 3-5 ish kuni ichida ko'rib chiqiladi.",
      data: { id: withdrawalId, amount: withdrawAmount, status: "pending" },
    });
  } catch (err) {
    console.error("Withdraw xatosi:", err);
    return NextResponse.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
