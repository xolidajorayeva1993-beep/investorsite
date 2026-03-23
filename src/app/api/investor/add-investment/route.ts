import { NextRequest, NextResponse } from "next/server";
import { CAMPAIGN_TARGET_UZS } from "@/lib/constants";
import crypto from "crypto";
import * as store from "@/lib/store";
import { db } from "@/lib/firebase-admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  try {
    const { login, password, amount } = await req.json();

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

    const addAmount = Number(amount);
    if (!Number.isFinite(addAmount) || addAmount < 100_000) {
      return NextResponse.json({ ok: false, error: "Minimal qo'shimcha investitsiya 100,000 so'm" }, { status: 400 });
    }

    // Kapital limitini tekshirish
    const allApps = await store.getAll("applications");
    const totalInvested = allApps
      .filter((a: any) => a.status !== "rejected")
      .reduce((sum: number, a: any) => sum + (Number(a.investmentAmountUzs) || 0), 0);

    if (totalInvested + addAmount > CAMPAIGN_TARGET_UZS) {
      const remaining = CAMPAIGN_TARGET_UZS - totalInvested;
      return NextResponse.json({
        ok: false,
        error: remaining > 0
          ? `Qolgan joy faqat ${remaining.toLocaleString()} so'm`
          : "Investitsiya qabul qilish to'xtatilgan",
      }, { status: 400 });
    }

    const oldAmount = Number(app.investmentAmountUzs) || 0;
    const newAmount = oldAmount + addAmount;

    const txId = `TX-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    // Batch: update application + add transaction
    const batch = db.batch();
    batch.update(db.collection("applications").doc(app.id), {
      investmentAmountUzs: newAmount,
      _updatedAt: now,
    });
    batch.set(db.collection("transactions").doc(txId), {
      id: txId,
      investorId: app.id,
      type: "deposit",
      amount: addAmount,
      description: `Qo'shimcha investitsiya: ${addAmount.toLocaleString()} so'm`,
      oldBalance: oldAmount,
      newBalance: newAmount,
      createdAt: now,
      _createdAt: now,
      _updatedAt: now,
    });
    await batch.commit();

    return NextResponse.json({
      ok: true,
      message: `${addAmount.toLocaleString()} so'm qo'shimcha investitsiya qabul qilindi.`,
      data: { transactionId: txId, oldAmount, newAmount, addedAmount: addAmount },
    });
  } catch (err) {
    console.error("Add-investment xatosi:", err);
    return NextResponse.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
