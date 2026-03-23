import { NextRequest, NextResponse } from "next/server";
import { getStorageSignedUrl } from "@/lib/store";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const secret = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("secret") || "";
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const { filename } = await params;
  if (!filename || !/^[\w\-.]+$/.test(filename)) {
    return NextResponse.json({ error: "Noto'g'ri fayl nomi" }, { status: 400 });
  }
  try {
    const url = await getStorageSignedUrl("receipts", filename);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Fayl topilmadi" }, { status: 404 });
  }
}
