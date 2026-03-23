import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as store from "@/lib/store";

/* eslint-disable @typescript-eslint/no-explicit-any */

function authInvestor(apps: any[], login: string, password: string) {
  const cleanLogin = login.replace(/\s+/g, "");
  const app = apps.find((a: any) => a.phone === cleanLogin);
  if (!app) return null;
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  if (app.passwordHash && app.passwordHash !== passwordHash) return null;
  return app;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      const { login, password } = body;
      if (!login || !password) {
        return NextResponse.json({ ok: false, error: "Avtorizatsiya xatosi" }, { status: 401 });
      }
      const allApps = await store.getAll("applications");
      const me = authInvestor(allApps, login, password);
      if (!me) return NextResponse.json({ ok: false, error: "Avtorizatsiya xatosi" }, { status: 401 });

      const expenses = await store.getAll("expenses");
      const activeCount = allApps.filter((a: any) => a.status === "active").length;

      const enriched = expenses.map((exp: any) => {
        const yesVotes = (exp.votes || []).filter((v: any) => v.vote === "yes").length;
        const noVotes = (exp.votes || []).filter((v: any) => v.vote === "no").length;
        const myVote = (exp.votes || []).find((v: any) => v.investorId === me.id);
        return {
          id: exp.id, title: exp.title, description: exp.description, amount: exp.amount,
          createdAt: exp.createdAt, deadline: exp.deadline, status: exp.status,
          yesVotes, noVotes, totalVoters: activeCount, myVote: myVote?.vote || null,
          completedAt: exp.completedAt || null,
        };
      });

      return NextResponse.json({ ok: true, data: { expenses: enriched.reverse() } });
    }

    if (action === "vote") {
      const { login, password, expenseId, vote } = body;
      if (!login || !password) return NextResponse.json({ ok: false, error: "Avtorizatsiya xatosi" }, { status: 401 });
      if (!expenseId || !["yes", "no"].includes(vote)) return NextResponse.json({ ok: false, error: "Noto'g'ri parametrlar" }, { status: 400 });

      const allApps = await store.getAll("applications");
      const me = authInvestor(allApps, login, password);
      if (!me) return NextResponse.json({ ok: false, error: "Avtorizatsiya xatosi" }, { status: 401 });
      if (me.status !== "active") return NextResponse.json({ ok: false, error: "Faqat faol investorlar ovoz berishi mumkin" }, { status: 403 });

      const exp = await store.getDoc("expenses", expenseId);
      if (!exp) return NextResponse.json({ ok: false, error: "Sarf topilmadi" }, { status: 404 });
      if (exp.status !== "voting") return NextResponse.json({ ok: false, error: "Bu sarf hozir ovozga ochiq emas" }, { status: 400 });

      const deadline = exp.deadline ? new Date(exp.deadline) : null;
      if (deadline && deadline < new Date()) return NextResponse.json({ ok: false, error: "Ovoz berish muddati tugagan" }, { status: 400 });

      const votes: any[] = exp.votes || [];
      const existing = votes.findIndex((v: any) => v.investorId === me.id);
      if (existing >= 0) {
        votes[existing] = { investorId: me.id, vote, votedAt: new Date().toISOString() };
      } else {
        votes.push({ investorId: me.id, vote, votedAt: new Date().toISOString() });
      }

      const activeCount = allApps.filter((a: any) => a.status === "active").length;
      const yesVotes = votes.filter((v: any) => v.vote === "yes").length;
      const newStatus = yesVotes > activeCount / 2 ? "approved" : exp.status;

      await store.updateFields("expenses", expenseId, { votes, status: newStatus });
      return NextResponse.json({ ok: true, message: "Ovozingiz qabul qilindi", data: { vote, yesVotes, totalVoters: activeCount } });
    }

    return NextResponse.json({ ok: false, error: "Noma'lum action" }, { status: 400 });
  } catch (err) {
    console.error("Expenses xatosi:", err);
    return NextResponse.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
