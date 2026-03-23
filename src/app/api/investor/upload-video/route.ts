import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    const applicationId = formData.get("applicationId") as string | null;

    if (!file || !applicationId) {
      return NextResponse.json({ ok: false, error: "Video yoki ariza raqami kiritilmagan" }, { status: 400 });
    }

    const allowedTypes = ["video/mp4", "video/webm"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "Faqat MP4 yoki WebM formatida video yuklash mumkin" }, { status: 400 });
    }

    // Max 100MB
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Video hajmi 100MB dan oshmasligi kerak" }, { status: 400 });
    }

    const ext = file.type === "video/mp4" ? ".mp4" : ".webm";
    const fileName = `${applicationId}_${Date.now()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const videoUrl = await store.uploadToStorage("videos", fileName, buffer, file.type);

    await store.updateFields("applications", applicationId, {
      videoFile: fileName,
      videoUrl,
      videoUploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, fileName });
  } catch (err) {
    console.error("Video upload xatosi:", err);
    return NextResponse.json({ ok: false, error: "Video saqlashda xatolik" }, { status: 500 });
  }
}
