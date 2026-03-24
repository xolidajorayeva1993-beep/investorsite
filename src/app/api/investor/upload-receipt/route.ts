import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as store from "@/lib/store";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  try {
    const contentTypeHeader = req.headers.get("content-type") || "";
    let login = "";
    let password = "";
    let receiptData: string | null = null;
    let receiptNote = "";
    let receiptFile: File | null = null;

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await req.formData();
      login = String(formData.get("login") || "");
      password = String(formData.get("password") || "");
      receiptNote = String(formData.get("receiptNote") || "");
      const filePart = formData.get("receipt");
      if (filePart instanceof File) {
        receiptFile = filePart;
      }
    } else {
      const body = await req.json();
      login = String(body.login || "");
      password = String(body.password || "");
      receiptData = typeof body.receiptData === "string" ? body.receiptData : null;
      receiptNote = String(body.receiptNote || "");
    }

    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "Login va parol kerak" }, { status: 400 });
    }
    if (!receiptFile && !receiptData) {
      return NextResponse.json({ ok: false, error: "Chek rasmi yuborilmagan" }, { status: 400 });
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

    let buffer: Buffer;
    let receiptContentType = "image/jpeg";
    let safeExt = "jpg";

    if (receiptFile) {
      if (!receiptFile.type.startsWith("image/")) {
        return NextResponse.json({ ok: false, error: "Faqat rasm formatidagi chek yuborish mumkin" }, { status: 400 });
      }
      if (receiptFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ ok: false, error: "Chek rasmi juda katta (max 10MB)" }, { status: 400 });
      }
      receiptContentType = receiptFile.type || "image/jpeg";
      const extFromName = receiptFile.name.includes(".")
        ? receiptFile.name.split(".").pop()?.toLowerCase() || "jpg"
        : "jpg";
      safeExt = ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extFromName)
        ? extFromName
        : "jpg";
      buffer = Buffer.from(await receiptFile.arrayBuffer());
    } else {
      // Legacy base64 path
      if (typeof receiptData !== "string" || receiptData.length > 14_000_000) {
        return NextResponse.json({ ok: false, error: "Chek rasmi juda katta (max 10MB)" }, { status: 400 });
      }
      const base64Match = receiptData.match(/^data:image\/(\w+);base64,(.+)$/);
      const ext = base64Match ? base64Match[1] : "jpg";
      const base64Content = base64Match ? base64Match[2] : receiptData;
      receiptContentType = base64Match ? `image/${base64Match[1]}` : "image/jpeg";
      safeExt = ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
      buffer = Buffer.from(base64Content, "base64");
    }

    const fileName = `${app.id}_${Date.now()}.${safeExt}`;
    const receiptUrl = await store.uploadToStorage("receipts", fileName, buffer, receiptContentType);

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
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server xatosi" },
      { status: 500 }
    );
  }
}
