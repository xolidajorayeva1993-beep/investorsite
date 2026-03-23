import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as store from "@/lib/store";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, login, password } = body;

    if (!login || !password) {
      return NextResponse.json({ ok: false, error: "Avtorizatsiya xatosi" }, { status: 401 });
    }

    const cleanLogin = login.replace(/\s+/g, "");
    const me = await store.findOne("applications", "phone", cleanLogin);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Investor topilmadi" }, { status: 404 });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    if (me.passwordHash && me.passwordHash !== passwordHash) {
      return NextResponse.json({ ok: false, error: "Parol noto'g'ri" }, { status: 401 });
    }

    /* ═══ Bildirishnomalar ro'yxati ═══ */
    if (action === "list" || !action) {
      const notifications = await store.getAll("notifications");
      const enriched = notifications
        .slice(-50)
        .reverse()
        .map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          createdAt: n.createdAt,
          isRead: (n.readBy || []).includes(me.id),
        }));

      const unreadCount = enriched.filter((n: any) => !n.isRead).length;
      return NextResponse.json({ ok: true, data: { notifications: enriched, unreadCount } });
    }

    /* ═══ O'qildi deb belgilash ═══ */
    if (action === "markRead") {
      const { notificationId } = body;
      const notifications = await store.getAll("notifications");

      if (notificationId === "all") {
        await Promise.all(
          notifications.map((n: any) => {
            const readBy: string[] = n.readBy || [];
            if (!readBy.includes(me.id)) {
              return store.updateFields("notifications", n.id, { readBy: [...readBy, me.id] });
            }
          })
        );
      } else if (notificationId) {
        const n = await store.getDoc("notifications", notificationId);
        if (n) {
          const readBy: string[] = n.readBy || [];
          if (!readBy.includes(me.id)) {
            await store.updateFields("notifications", notificationId, {
              readBy: [...readBy, me.id],
            });
          }
        }
      }

      return NextResponse.json({ ok: true, message: "Belgilandi" });
    }

    return NextResponse.json({ ok: false, error: "Noma'lum action" }, { status: 400 });
  } catch (err) {
    console.error("Notifications xatosi:", err);
    return NextResponse.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
