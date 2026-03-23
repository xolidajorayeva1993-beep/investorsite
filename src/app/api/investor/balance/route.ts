import { NextRequest, NextResponse } from "next/server";
import { INVESTOR_POOL_PCT } from "@/lib/constants";
import crypto from "crypto";
import * as store from "@/lib/store";
import { db } from "@/lib/firebase-admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, login, password } = body;

    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "Avtorizatsiya xatosi" }, { status: 401 });
    }

    const cleanLogin = login.replace(/\s+/g, "");
    const app = await store.findOne("applications", "phone", cleanLogin);
    if (!app) return NextResponse.json({ ok: false, error: "Investor topilmadi" }, { status: 404 });

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    if (app.passwordHash && app.passwordHash !== passwordHash) {
      return NextResponse.json({ ok: false, error: "Parol noto''g''ri" }, { status: 401 });
    }

    if (app.status !== "active") {
      return NextResponse.json({ ok: false, error: "Faqat faol investorlar uchun" }, { status: 403 });
    }

    const currentBalance = Number(app.balance) || 0;

    if (action === "withdrawFromBalance") {
      const { amount, bankName, cardNumber } = body;
      const withdrawAmount = Number(amount);
      if (!Number.isFinite(withdrawAmount) || withdrawAmount < 10_000) {
        return NextResponse.json({ ok: false, error: "Minimal yechish miqdori 10,000 so''m" }, { status: 400 });
      }
      if (withdrawAmount > currentBalance) {
        return NextResponse.json({ ok: false, error: `Balansda yetarli mablag'' yo''q. Mavjud: ${currentBalance.toLocaleString()} so''m` }, { status: 400 });
      }
      if (!cardNumber || typeof cardNumber !== "string" || cardNumber.replace(/\s/g, "").length < 16) {
        return NextResponse.json({ ok: false, error: "Karta raqami noto''g''ri" }, { status: 400 });
      }

      const txId = `TX-${Date.now().toString(36).toUpperCase()}`;
      const newBalance = currentBalance - withdrawAmount;
      const now = new Date().toISOString();

      const batch = db.batch();
      batch.update(db.collection("applications").doc(app.id), { balance: newBalance, _updatedAt: now });
      batch.set(db.collection("transactions").doc(txId), {
        id: txId, investorId: app.id, type: "balance_withdrawal", amount: withdrawAmount,
        description: `Balansdan yechish  ${bankName || ""} ${cardNumber}`,
        createdAt: now, _createdAt: now, _updatedAt: now,
      });
      await batch.commit();

      return NextResponse.json({
        ok: true, message: "Yechish so''rovi bajarildi",
        data: { transactionId: txId, oldBalance: currentBalance, newBalance, withdrawnAmount: withdrawAmount },
      });
    }

    if (action === "getBalance" || !action) {
      const allApps = await store.getAll("applications");
      const totalInvested = allApps
        .filter((a: any) => a.status !== "rejected")
        .reduce((s: number, a: any) => s + (Number(a.investmentAmountUzs) || 0), 0);
      const myShare = totalInvested > 0 ? ((Number(app.investmentAmountUzs) || 0) / totalInvested) * INVESTOR_POOL_PCT : 0;

      const userTxs = await db.collection("transactions").where("investorId", "==", app.id).get();
      const transactions = userTxs.docs.map(d => d.data()).sort((a, b) => (b.createdAt as string).localeCompare(a.createdAt as string));

      const userNotifs = await store.getAll("notifications");
      const unreadCount = userNotifs.filter((n: any) => !(n.readBy || []).includes(app.id)).length;

      return NextResponse.json({
        ok: true,
        data: {
          balance: currentBalance, sharePercent: myShare, totalInvested,
          investmentAmount: Number(app.investmentAmountUzs) || 0,
          transactions: transactions.slice(0, 20), unreadNotificationsCount: unreadCount,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Noma''lum action" }, { status: 400 });
  } catch (err) {
    console.error("Balance xatosi:", err);
    return NextResponse.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
