import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as store from "@/lib/store";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  try {
    const { login, password, receiptData, receiptNote } = await req.json();

    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "Login va parol kerak" }, { status: 400 });
    }
    if (!receiptData) {
      return NextResponse.json({ ok: false, error: "Chek rasmi yuborilmagan" }, { status: 400 });
    }

    // Base64 data validation (max ~5MB)
    if (typeof receiptData !== "string" || receiptData.length > 7_000_000) {
      return NextResponse.json({ ok: false, error: "Chek rasmi juda katta (max 5MB)" }, { status: 400 });
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

    if (app.status !== "approved") {
      return NextResponse.json(
        { ok: false, error: "Faqat tasdiqlangan arizalar uchun chek yuborish mumkin" },
        { status: 400 }
      );
    }

    const base64Match = receiptData.match(/^data:image\/(\w+);base64,(.+)$/);
    const ext = base64Match ? base64Match[1] : "jpg";
    const base64Content = base64Match ? base64Match[2] : receiptData;
    const contentType = base64Match ? `image/${base64Match[1]}` : "image/jpeg";

    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
    const fileName = `${app.id}_${Date.now()}.${safeExt}`;

    const buffer = Buffer.from(base64Content, "base64");
    const receiptUrl = await store.uploadToStorage("receipts", fileName, buffer, contentType);

    await store.updateFields("applications", app.id, {
      status: "payment_uploaded",
      paymentReceiptFile: fileName,
      paymentReceiptUrl: receiptUrl,
      paymentReceiptNote: receiptNote || "",
      paymentUploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, message: "Chek muvaffaqiyatli yuklandi" });
  } catch (err) {
    console.error("Chek yuklash xatosi:", err);
    return NextResponse.json({ ok: false, error: "Server xatosi" }, { status: 500 });
  }
}
