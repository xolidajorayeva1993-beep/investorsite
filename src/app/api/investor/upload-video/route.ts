import { NextRequest, NextResponse } from "next/server";
import * as store from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    const applicationId = formData.get("applicationId") as string | null;

    if (!file || !applicationId) {
      console.warn("Video upload: Missing file or applicationId", { hasFile: !!file, hasAppId: !!applicationId });
      return NextResponse.json({ ok: false, error: "Video yoki ariza raqami kiritilmagan" }, { status: 400 });
    }

    const allowedTypes = ["video/mp4", "video/webm"];
    if (!allowedTypes.includes(file.type)) {
      console.warn("Video upload: Invalid file type", { type: file.type });
      return NextResponse.json({ ok: false, error: "Faqat MP4 yoki WebM formatida video yuklash mumkin" }, { status: 400 });
    }

    // Max 100MB
    if (file.size > 100 * 1024 * 1024) {
      console.warn("Video upload: File too large", { size: file.size });
      return NextResponse.json({ ok: false, error: "Video hajmi 100MB dan oshmasligi kerak" }, { status: 400 });
    }

    console.log("Video upload starting", { applicationId, fileName: file.name, fileSize: file.size, type: file.type });

    const ext = file.type === "video/mp4" ? ".mp4" : ".webm";
    const fileName = `${applicationId}_${Date.now()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("Buffer created, uploading to Storage", { fileName, bufferSize: buffer.length });
    
    const videoUrl = await store.uploadToStorage("videos", fileName, buffer, file.type);

    console.log("Video uploaded to Storage, updating Firestore", { applicationId, videoUrl });

    await store.updateFields("applications", applicationId, {
      videoFile: fileName,
      videoUrl,
      videoUploadedAt: new Date().toISOString(),
    });

    console.log("Video upload completed successfully", { applicationId, fileName });
    return NextResponse.json({ ok: true, fileName });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Video upload xatosi:", {
      error: errorMsg,
      stack: err instanceof Error ? err.stack : undefined,
      type: err instanceof Error ? err.constructor.name : typeof err,
    });
    return NextResponse.json({ ok: false, error: `Video saqlashda xatolik: ${errorMsg}` }, { status: 500 });
  }
}
