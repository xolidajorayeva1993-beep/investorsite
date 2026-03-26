import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: false,
    error: "Bu bo'lim vaqtincha ishlamayapti. Kelajakda bu yerga to'lov tizimlarini integratsiya qilamiz.",
  }, { status: 503 });
}
