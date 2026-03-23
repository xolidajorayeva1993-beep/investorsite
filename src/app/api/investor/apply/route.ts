import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { readPlatformConfig } from "@/lib/platform-config";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fullName,
      passportSeries,
      passportNumber,
      phone,
      email,
      address,
      investmentAmountUzs,
      consentAccepted,
      password,
      contractId,
      contractHash,
      contractSignedAt,
      videoConfirmed,
      poolSharePct,
    } = body;

    // ── Validatsiya ──
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 3) {
      return NextResponse.json({ ok: false, error: "To'liq ism kiritilmagan" }, { status: 400 });
    }
    if (!passportSeries || passportSeries.trim().length < 2) {
      return NextResponse.json({ ok: false, error: "Pasport seriyasi noto'g'ri" }, { status: 400 });
    }
    if (!passportNumber || passportNumber.trim().length < 6) {
      return NextResponse.json({ ok: false, error: "Pasport raqami noto'g'ri" }, { status: 400 });
    }
    if (!phone || phone.trim().length < 9) {
      return NextResponse.json({ ok: false, error: "Telefon raqam kiritilmagan" }, { status: 400 });
    }
    const amount = Number(investmentAmountUzs);
    if (!Number.isFinite(amount) || amount < 100_000) {
      return NextResponse.json({ ok: false, error: "Investitsiya miqdori kamida 100,000 so'm" }, { status: 400 });
    }
    if (!consentAccepted) {
      return NextResponse.json({ ok: false, error: "Shartlarga rozilik berilmagan" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ ok: false, error: "Parol kamida 6 belgidan iborat bo'lishi kerak" }, { status: 400 });
    }

    // ── Kapital limitini tekshirish ──
    let currentCapital = 0;
    try {
      const investorsSnap = await db
        .collection("investors")
        .where("status", "==", "active")
        .get();
      investorsSnap.forEach((doc) => {
        currentCapital += Number(doc.data().investedUzs) || 0;
      });
    } catch {
      // Firebase mavjud bo'lmasa, davom etamiz
    }

    const { campaignTargetUzs } = await readPlatformConfig();
    if (currentCapital + amount > campaignTargetUzs) {
      const remaining = campaignTargetUzs - currentCapital;
      return NextResponse.json({
        ok: false,
        error: remaining > 0
          ? `Qolgan joy faqat ${remaining.toLocaleString()} so'm. Miqdorni kamaytiring.`
          : "Investitsiya qabul qilish to'xtatilgan - maqsadga erishildi.",
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const applicationId = `APP-${Date.now().toString(36).toUpperCase()}`;
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    const applicationData = {
      id: applicationId,
      fullName: fullName.trim(),
      passportSeries: passportSeries.trim().toUpperCase(),
      passportNumber: passportNumber.trim(),
      phone: phone.trim(),
      email: (email || "").trim(),
      address: (address || "").trim(),
      investmentAmountUzs: amount,
      consentAccepted: true,
      passwordHash,
      contractId: contractId || null,
      contractHash: contractHash || null,
      contractSignedAt: contractSignedAt || null,
      videoConfirmed: !!videoConfirmed,
      poolSharePct: Number(poolSharePct) || 0,
      status: "pending",
      createdAt: now,
      _createdAt: now,
      _updatedAt: now,
    };

    await db.collection("applications").doc(applicationId).set(applicationData);

    const login = phone.trim().replace(/\s+/g, "");
    return NextResponse.json({
      ok: true,
      message: "Arizangiz qabul qilindi! 24 soat ichida bog'lanamiz.",
      data: { applicationId, contractId: contractId || applicationId, login },
    });
  } catch (err) {
    console.error("Apply xatosi:", err);
    return NextResponse.json(
      { ok: false, error: "Kutilmagan xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
