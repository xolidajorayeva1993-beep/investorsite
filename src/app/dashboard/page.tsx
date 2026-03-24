"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

/* ═══════════════ TYPES ═══════════════ */
type ProjectInfo = {
  key: string;
  name: string;
  state: string;
  monthlyRevenueUzs: number;
  activeClients: number;
  newClients30d: number;
  syncEventsToday: number;
  lastSync: string | null;
  freeUsers: number;
  paidUsers: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  totalRevenue: number;
};

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  bankName: string;
  cardNumber: string;
  createdAt: string;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
};

type InvestorData = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  passportSeries: string;
  passportNumber: string;
  address: string;
  investmentAmountUzs: number;
  contractId: string;
  contractHash: string;
  status: string;
  createdAt: string;
  poolSharePct: number;
  totalInvested: number;
  investorCount: number;
  campaignTarget: number;
  campaignProgress: number;
  monthlyRevenueUzs: number;
  monthlyProfit: number;
  yearlyProfit: number;
  creatorSharePct: number;
  investorPoolPct: number;
  projects: ProjectInfo[];
  totalWithdrawn: number;
  availableBalance: number;
  withdrawals: Withdrawal[];
  transactions: Transaction[];
  /* workflow fields */
  approvedAt?: string;
  activatedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paymentUploadedAt?: string;
  adminRequisites?: { bank: string; account: string; mfo: string; inn: string; recipient: string };
  adminContactInfo?: { phone: string; telegram: string };
  adminNote?: string;
  canWithdraw?: boolean;
  nextDistributionDate?: string;
  estimatedMonthlyProfit?: number;
  /* yangi fieldlar */
  balance?: number;
  unreadNotifications?: number;
  /* chegirmalar */
  deductions?: { taxPercent: number; commissionPercent: number; serverCostPercent: number; otherPercent: number };
  totalDeductionPct?: number;
  netMonthlyRevenue?: number;
  netMonthlyProfit?: number;
  netYearlyProfit?: number;
  expenses?: ExpenseItem[];
  totalExpensesAmount?: number;
  totalDistributed?: number;
  lastDistributionMonth?: string;
  lastDistributionData?: {
    monthlyRevenue: number;
    netRevenue: number;
    investorPool: number;
    creatorShare: number;
    distributedAt: string;
  };
};

type InvestorListItem = {
  phoneLast4: string;
  investmentAmount: number;
  sharePercent: number;
  joinedDate: string;
  isMe: boolean;
};

type ExpenseItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  deadline: string;
  status: string;
  yesVotes: number;
  noVotes: number;
  totalVoters: number;
  myVote: string | null;
  completedAt?: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

type Tab = "overview" | "investors" | "portfolio" | "balance" | "expenses" | "invest" | "contract" | "history" | "settings";

type OwnerData = {
  fullName: string;
  jshshir: string;
  passport: string;
  address: string;
  guvohnoma: string;
  guvohnomaDate: string;
  phone: string;
  bank: string;
  hisob: string;
  mfo: string;
  inn: string;
};

const DEFAULT_OWNER: OwnerData = {
  fullName: "Ro'ziboyev Iqboljon Talibovich",
  jshshir: "30308920580088",
  passport: "AB 746 56 99",
  address: "Toshkent viloyati, Ohangaron tumani, Nurobod MFY, Nurobod qo'rg'oni ko'chasi 12 uy",
  guvohnoma: "5640805",
  guvohnomaDate: "15.09.2023",
  phone: "+998 93 585 05 07",
  bank: "Kapitalbank",
  hisob: "2020 8000 9051 5374 0002",
  mfo: "01057",
  inn: "303089205",
};

/* ═══════════════ HELPERS ═══════════════ */
function fmtMoney(n: number): string {
  return n.toLocaleString("uz-UZ");
}
function fmtShort(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + " ming";
  return n.toString();
}
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("uz-UZ", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}
function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("uz-UZ", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

/* ═══════════════ MAIN ═══════════════ */
export default function DashboardPage() {
  /* ── Auth state ── */
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<InvestorData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  /* ── Modals / forms ── */
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [wdAmount, setWdAmount] = useState("");
  const [wdBank, setWdBank] = useState("");
  const [wdCard, setWdCard] = useState("");
  const [wdNote, setWdNote] = useState("");
  const [wdLoading, setWdLoading] = useState(false);
  const [wdMsg, setWdMsg] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  /* ── Receipt upload state ── */
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptNote, setReceiptNote] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState("");

  /* ── Balance withdraw state ── */
  const [balWdAmount, setBalWdAmount] = useState("");
  const [balWdBank, setBalWdBank] = useState("");
  const [balWdCard, setBalWdCard] = useState("");
  const [balWdLoading, setBalWdLoading] = useState(false);
  const [balWdMsg, setBalWdMsg] = useState("");

  /* ── Reinvest state ── */
  const [reinvestAmount, setReinvestAmount] = useState("");
  const [reinvestLoading, setReinvestLoading] = useState(false);
  const [reinvestMsg, setReinvestMsg] = useState("");

  /* ── Investor list, expenses, notifications  ── */
  const [investorsList, setInvestorsList] = useState<InvestorListItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [OWNER, setOwner] = useState<OwnerData>(DEFAULT_OWNER);
  const [unreadCount, setUnreadCount] = useState(0);
  const [voteLoading, setVoteLoading] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  /* ── Auth credentials stored for API calls ── */
  const [authLogin, setAuthLogin] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  /* ── Login ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/investor/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password: password.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      setData(json.data);
      setAuthLogin(login.trim());
      setAuthPassword(password.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  /* ── Refresh data ── */
  const refreshData = useCallback(async () => {
    if (!authLogin || !authPassword) return;
    try {
      const res = await fetch("/api/investor/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login: authLogin, password: authPassword }),
      });
      const json = await res.json();
      if (json.ok) setData(json.data);
    } catch { /* ignore */ }
  }, [authLogin, authPassword]);

  /* ── Fetch investor list ── */
  const fetchInvestorsList = useCallback(async () => {
    if (!authLogin || !authPassword) return;
    try {
      const res = await fetch("/api/investors/list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login: authLogin, password: authPassword }),
      });
      const json = await res.json();
      if (json.ok) setInvestorsList(json.data.investors);
    } catch { /* ignore */ }
  }, [authLogin, authPassword]);

  /* ── Fetch expenses ── */
  const fetchExpenses = useCallback(async () => {
    if (!authLogin || !authPassword) return;
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "list", login: authLogin, password: authPassword }),
      });
      const json = await res.json();
      if (json.ok) setExpenses(json.data.expenses);
    } catch { /* ignore */ }
  }, [authLogin, authPassword]);

  /* ── Fetch notifications ── */
  const fetchNotifications = useCallback(async () => {
    if (!authLogin || !authPassword) return;
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "list", login: authLogin, password: authPassword }),
      });
      const json = await res.json();
      if (json.ok) {
        setNotifications(json.data.notifications);
        setUnreadCount(json.data.unreadCount);
      }
    } catch { /* ignore */ }
  }, [authLogin, authPassword]);

  /* ── Auto refresh every 60s ── */
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      refreshData();
      fetchNotifications();
    }, 60_000);
    return () => clearInterval(interval);
  }, [data, refreshData, fetchNotifications]);

  /* ── Load extra data when logged in ── */
  useEffect(() => {
    if (!authLogin || !authPassword || !data) return;
    fetchInvestorsList();
    fetchExpenses();
    fetchNotifications();
    // Fetch owner settings for contract display
    fetch("/api/owner").then(r => r.json()).then(d => { if (d.success && d.owner) setOwner(d.owner); }).catch(() => {});
    // Avtomatik foyda taqsimlash: 25-sanada cron endpointni chaqirish
    const day = new Date().getDate();
    if (day >= 25) {
      fetch("/api/cron/distribute", { headers: { "x-cron-secret": "auto" } }).catch(() => {});
    }
  }, [authLogin, authPassword, data, fetchInvestorsList, fetchExpenses, fetchNotifications]);

  /* ── Vote on expense ── */
  const handleVote = async (expenseId: string, vote: "yes" | "no") => {
    setVoteLoading(expenseId);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "vote", login: authLogin, password: authPassword, expenseId, vote }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      await fetchExpenses();
    } catch { /* ignore */ }
    setVoteLoading("");
  };

  /* ── Balance withdraw ── */
  const handleBalanceWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setBalWdLoading(true);
    setBalWdMsg("");
    try {
      const res = await fetch("/api/investor/balance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "withdrawFromBalance",
          login: authLogin,
          password: authPassword,
          amount: Number(balWdAmount),
          bankName: balWdBank,
          cardNumber: balWdCard,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      setBalWdMsg(json.message);
      setBalWdAmount(""); setBalWdBank(""); setBalWdCard("");
      await refreshData();
    } catch (err) {
      setBalWdMsg(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setBalWdLoading(false);
    }
  };

  /* ── Reinvest ── */
  const handleReinvest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReinvestLoading(true);
    setReinvestMsg("");
    try {
      const res = await fetch("/api/investor/balance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "reinvest",
          login: authLogin,
          password: authPassword,
          amount: Number(reinvestAmount),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      setReinvestMsg(json.message);
      setReinvestAmount("");
      await refreshData();
      await fetchInvestorsList();
    } catch (err) {
      setReinvestMsg(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setReinvestLoading(false);
    }
  };

  /* ── Mark notifications read ── */
  const markNotificationsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "markRead", login: authLogin, password: authPassword, notificationId: "all" }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  /* ── Withdraw ── */
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWdLoading(true);
    setWdMsg("");
    try {
      const res = await fetch("/api/investor/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: authLogin,
          password: authPassword,
          amount: Number(wdAmount),
          bankName: wdBank,
          cardNumber: wdCard,
          note: wdNote,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      setWdMsg(json.message);
      setWdAmount(""); setWdBank(""); setWdCard(""); setWdNote("");
      setShowWithdrawForm(false);
      await refreshData();
    } catch (err) {
      setWdMsg(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setWdLoading(false);
    }
  };

  /* ── Add investment ── */
  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddMsg("");
    try {
      const res = await fetch("/api/investor/add-investment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: authLogin,
          password: authPassword,
          amount: Number(addAmount),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      setAddMsg(json.message);
      setAddAmount("");
      setShowAddForm(false);
      await refreshData();
    } catch (err) {
      setAddMsg(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setAddLoading(false);
    }
  };

  /* ── Logout ── */
  const handleLogout = () => {
    setData(null);
    setLogin("");
    setPassword("");
    setAuthLogin("");
    setAuthPassword("");
    setActiveTab("overview");
  };

  /* ── Upload receipt ── */
  const handleUploadReceipt = async () => {
    if (!receiptFile) return;
    setReceiptLoading(true);
    setReceiptMsg("");
    try {
      if (receiptFile.size > 10 * 1024 * 1024) {
        throw new Error("Chek rasmi juda katta (max 10MB)");
      }

      const fd = new FormData();
      fd.append("login", authLogin);
      fd.append("password", authPassword);
      fd.append("receiptNote", receiptNote || "");
      fd.append("receipt", receiptFile);

      const res = await fetch("/api/investor/upload-receipt", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      setReceiptMsg("Chek muvaffaqiyatli yuborildi! Admin tekshiradi.");
      setReceiptFile(null);
      setReceiptNote("");
      await refreshData();
    } catch (err) {
      setReceiptMsg(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setReceiptLoading(false);
    }
  };

  /* ── Status badge ── */
  const statusMap: Record<string, { label: string; cls: string }> = {
    pending: { label: "Ko'rib chiqilmoqda", cls: "badge badge-gold" },
    approved: { label: "To'lov kutilmoqda", cls: "badge badge-section" },
    payment_uploaded: { label: "Chek yuborilgan", cls: "badge badge-gold" },
    active: { label: "Faol", cls: "badge badge-live" },
    rejected: { label: "Rad etilgan", cls: "badge badge-offline" },
  };

  /* ── ROI hisoblash ── */
  const roi = useMemo(() => {
    if (!data || !data.investmentAmountUzs) return 0;
    return (data.yearlyProfit / data.investmentAmountUzs) * 100;
  }, [data]);

  /* ═══════════════ LOGIN SCREEN ═══════════════ */
  if (!data) {
    return (
      <div className="shell pt-4 pb-10">
        <header className="top-nav mt-2">
          <BrandLogo />
          <nav className="flex items-center gap-1">
            <Link href="/" className="nav-link">Bosh sahifa</Link>
            <Link href="/become-investor" className="nav-cta">Investitsiya qilish</Link>
          </nav>
        </header>

        <section className="mt-16 max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <span className="brand-dot" style={{ width: 14, height: 14 }} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Investor Kabineti</h1>
            <p className="text-text-secondary mt-2">Portfelingizni boshqaring</p>
          </div>

          <div className="card">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="stat-label">Telefon raqam</label>
                <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="+998901234567"
                  className="calc-input text-sm !font-normal" />
              </div>
              <div>
                <label className="stat-label">Parol</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="calc-input text-sm !font-normal" />
              </div>
              {error && <div className="text-sm text-danger bg-red-50/60 p-3 rounded-xl border border-red-100">{error}</div>}
              <button type="submit" disabled={loading || !login.trim() || !password.trim()} className="btn-primary w-full py-3.5 disabled:opacity-40">
                {loading ? "Tekshirilmoqda..." : "Kabinetga kirish"}
              </button>
            </form>
            <div className="mt-6 pt-4 border-t border-border-light text-center">
              <p className="text-xs text-text-muted mb-2">Hali investor emassiz?</p>
              <Link href="/become-investor" className="text-sm text-accent hover:underline">Investor bo&apos;lish →</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const st = statusMap[data.status] || statusMap.pending;
  const projectCount = data.projects?.length ?? 0;
  const projectStateLabel = (state: string) => state === "online" ? "Live" : state === "degraded" ? "Degraded" : state === "not_connected" ? "API ulanmagan" : "Offline";
  const projectStateBadge = (state: string) => state === "online" ? "badge-live" : state === "degraded" ? "badge-gold" : state === "not_connected" ? "badge-section" : "badge-offline";
  const projectStateDot = (state: string) => state === "online" ? "bg-green" : state === "not_connected" ? "bg-gold" : "bg-danger";

  /* ═══════════════ TAB NAV ═══════════════ */
  const isActive = data.status === "active";
  const tabs: { key: Tab; label: string; badge?: number }[] = isActive ? [
    { key: "overview", label: "Umumiy", badge: unreadCount || undefined },
    { key: "investors", label: "Investorlar" },
    { key: "portfolio", label: "Portfel" },
    { key: "balance", label: "Balans" },
    { key: "expenses", label: "Sarflar" },
    { key: "invest", label: "Qo'shish" },
    { key: "contract", label: "Shartnoma" },
    { key: "history", label: "Tarix" },
    { key: "settings", label: "Sozlamalar" },
  ] : [
    { key: "overview", label: "Holat" },
    { key: "contract", label: "Shartnoma" },
    { key: "settings", label: "Ma'lumotlar" },
  ];

  /* ═══════════════ DASHBOARD ═══════════════ */
  return (
    <div className="shell pt-4 pb-10">
      {/* ── Top Nav ── */}
      <header className="top-nav mt-2">
        <BrandLogo />
        <nav className="flex items-center gap-1 flex-wrap">
          <Link href="/" className="nav-link">Bosh sahifa</Link>
          <span className={st.cls}>{st.label}</span>
          <button onClick={handleLogout} className="nav-link text-text-muted hover:text-danger">Chiqish</button>
        </nav>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="mt-8 flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`calc-preset ${activeTab === t.key ? "active" : ""} relative`}>
            {t.label}
            {t.badge ? <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[10px] rounded-full flex items-center justify-center">{t.badge > 9 ? "9+" : t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ── Success messages ── */}
      {wdMsg && (
        <div className="mt-4 p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20 flex justify-between items-center">
          <span>{wdMsg}</span>
          <button onClick={() => setWdMsg("")} className="text-green/40 hover:text-green">✕</button>
        </div>
      )}
      {addMsg && (
        <div className="mt-4 p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20 flex justify-between items-center">
          <span>{addMsg}</span>
          <button onClick={() => setAddMsg("")} className="text-green/40 hover:text-green">✕</button>
        </div>
      )}

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {activeTab === "overview" && (
        <div className="mt-6">

          {/* ── PENDING ── */}
          {data.status === "pending" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Arizangiz ko&apos;rib chiqilmoqda</h1>
              <p className="text-text-secondary mt-1 text-sm">Admin arizangizni tekshirmoqda. Iltimos kuting.</p>

              <div className="card-elevated mt-6 text-center py-10">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gold">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Ariza kutilmoqda</h3>
                <p className="text-sm text-text-secondary max-w-xs mx-auto">Arizangiz yuborilgan. Admin tekshirib, rekvizitlar va kontakt ma&apos;lumotlarini yuboradi.</p>
                <div className="mt-4 text-xs text-text-muted">Ariza sanasi: {formatDateTime(data.createdAt)}</div>
              </div>

              <div className="card mt-6">
                <div className="stat-label mb-2">Ariza tafsilotlari</div>
                <div className="space-y-2">
                  {[
                    { label: "Shartnoma", value: data.contractId },
                    { label: "Investitsiya", value: `${fmtMoney(data.investmentAmountUzs)} so'm` },
                    { label: "Ariza sanasi", value: formatDateTime(data.createdAt) },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                      <span className="text-text-muted">{r.label}</span>
                      <span className="font-bold">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── APPROVED: to'lov kutilmoqda ── */}
          {data.status === "approved" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Arizangiz tasdiqlandi!</h1>
              <p className="text-text-secondary mt-1 text-sm">To&apos;lovni amalga oshirib, chek rasmini yuboring.</p>

              {receiptMsg && (
                <div className="mt-4 p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20">{receiptMsg}</div>
              )}

              {/* Admin rekvizitlari */}
              {data.adminRequisites && (
                <div className="card-elevated mt-6">
                  <div className="text-xs font-bold text-accent uppercase tracking-wider mb-4">To&apos;lov rekvizitlari</div>
                  <div className="space-y-2">
                    {[
                      { label: "Oluvchi", value: data.adminRequisites.recipient },
                      { label: "Bank", value: data.adminRequisites.bank },
                      { label: "Hisob raqam", value: data.adminRequisites.account, mono: true },
                      { label: "MFO", value: data.adminRequisites.mfo, mono: true },
                      { label: "INN", value: data.adminRequisites.inn, mono: true },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                        <span className="text-text-muted">{r.label}</span>
                        <span className={`font-bold ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin kontakt */}
              {data.adminContactInfo && (
                <div className="card mt-4">
                  <div className="stat-label mb-3">Aloqa ma&apos;lumotlari</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                      <span className="text-text-muted">Telefon</span>
                      <a href={`tel:${data.adminContactInfo.phone.replace(/\s/g, "")}`} className="font-bold text-accent">{data.adminContactInfo.phone}</a>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                      <span className="text-text-muted">Telegram</span>
                      <a href={`https://t.me/${data.adminContactInfo.telegram.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="font-bold text-accent">{data.adminContactInfo.telegram}</a>
                    </div>
                  </div>
                </div>
              )}

              {data.adminNote && (
                <div className="card mt-4">
                  <div className="stat-label mb-2">Admin izohi</div>
                  <p className="text-sm text-text-secondary">{data.adminNote}</p>
                </div>
              )}

              {/* Investitsiya miqdori */}
              <div className="card mt-4">
                <div className="stat-label mb-2">To&apos;lov miqdori</div>
                <div className="text-3xl font-bold text-accent text-center py-4">{fmtMoney(data.investmentAmountUzs)} <span className="text-base font-normal text-text-muted">so&apos;m</span></div>
              </div>

              {/* Chek yuklash */}
              <div className="card-elevated mt-6">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">To&apos;lov chekini yuborish</div>
                <div className="space-y-4">
                  <div>
                    <label className="stat-label mb-1">Chek rasmi</label>
                    <input type="file" accept="image/*"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer" />
                    {receiptFile && (
                      <p className="text-xs text-text-muted mt-1">{receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)</p>
                    )}
                  </div>
                  <div>
                    <label className="stat-label mb-1">Izoh (ixtiyoriy)</label>
                    <input type="text" value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)}
                      placeholder="Qo'shimcha ma'lumot..." className="calc-input text-sm !font-normal" />
                  </div>
                  <button onClick={handleUploadReceipt} disabled={receiptLoading || !receiptFile}
                    className="btn-primary w-full py-3.5 disabled:opacity-40">
                    {receiptLoading ? "Yuborilmoqda..." : "Chekni yuborish"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── PAYMENT UPLOADED ── */}
          {data.status === "payment_uploaded" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Chek yuborildi</h1>
              <p className="text-text-secondary mt-1 text-sm">Admin to&apos;lovingizni tekshirmoqda.</p>

              <div className="card-elevated mt-6 text-center py-10">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gold">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">To&apos;lov tekshirilmoqda</h3>
                <p className="text-sm text-text-secondary max-w-xs mx-auto">To&apos;lov chekingiz qabul qilindi. Admin tasdiqlashi kutilmoqda.</p>
                {data.paymentUploadedAt && <div className="mt-4 text-xs text-text-muted">Chek yuborilgan: {formatDateTime(data.paymentUploadedAt)}</div>}
              </div>

              <div className="card mt-6">
                <div className="stat-label mb-2">Investitsiya tafsilotlari</div>
                <div className="space-y-2">
                  {[
                    { label: "Shartnoma", value: data.contractId },
                    { label: "Miqdor", value: `${fmtMoney(data.investmentAmountUzs)} so'm` },
                    { label: "Ariza tasdiqlangan", value: data.approvedAt ? formatDateTime(data.approvedAt) : "—" },
                    { label: "Chek yuborilgan", value: data.paymentUploadedAt ? formatDateTime(data.paymentUploadedAt) : "—" },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                      <span className="text-text-muted">{r.label}</span>
                      <span className="font-bold">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── REJECTED ── */}
          {data.status === "rejected" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Ariza rad etildi</h1>
              <p className="text-text-secondary mt-1 text-sm">Afsuski, arizangiz qabul qilinmadi.</p>

              <div className="card-elevated mt-6 text-center py-10">
                <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-danger">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Ariza rad etildi</h3>
                {data.rejectionReason && <p className="text-sm text-text-secondary max-w-xs mx-auto mb-2">Sabab: {data.rejectionReason}</p>}
                {data.rejectedAt && <div className="text-xs text-text-muted">Rad etilgan sana: {formatDateTime(data.rejectedAt)}</div>}
                <Link href="/become-investor" className="btn-primary mt-6 inline-block">
                  Qayta ariza yuborish →
                </Link>
              </div>
            </>
          )}

          {/* ── ACTIVE: Full dashboard ── */}
          {data.status === "active" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Salom, {data.fullName.split(" ")[0]}</h1>
              <p className="text-text-secondary mt-1 text-sm">Portfelingiz — {data.activatedAt ? formatDate(data.activatedAt) : formatDate(data.createdAt)} dan beri faol</p>

          {/* ═══ 13 KPI Professional Grid ═══ */}
          {/* Row 1: Investitsiya */}
          <div className="mt-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Investitsiya</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="stat-box">
                <div className="stat-label">Umumiy investitsiya</div>
                <div className="stat-value">{fmtShort(data.investmentAmountUzs)}</div>
                <div className="text-xs text-text-muted mt-1">so&apos;m</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Sarflangan summa</div>
                <div className="stat-value text-danger">{fmtShort(data.totalExpensesAmount || 0)}</div>
                <div className="text-xs text-text-muted mt-1">so&apos;m</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Qolgan summa</div>
                <div className="stat-value text-green">{fmtShort(data.investmentAmountUzs - (data.totalExpensesAmount || 0))}</div>
                <div className="text-xs text-text-muted mt-1">so&apos;m</div>
              </div>
            </div>
          </div>

          {/* Row 2: Daromad */}
          <div className="mt-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Daromad</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="stat-box">
                <div className="stat-label">Umumiy daromad</div>
                <div className="stat-value text-accent">{fmtShort(data.monthlyRevenueUzs)}</div>
                <div className="text-xs text-text-muted mt-1">barcha loyihalardan</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Oylik toza daromad</div>
                <div className="stat-value text-accent">{fmtShort(data.netMonthlyProfit || data.monthlyProfit)}</div>
                <div className="text-xs text-text-muted mt-1">chegirmalar ayrilgan</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Shu oy kutilayotgan</div>
                <div className="stat-value text-gold">{fmtShort(data.estimatedMonthlyProfit || 0)}</div>
                <div className="text-xs text-text-muted mt-1">taxminiy</div>
              </div>
            </div>
          </div>

          {/* Row 3: Soliq va taqsimot */}
          <div className="mt-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Soliq va taqsimot</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="stat-box">
                <div className="stat-label">Umumiy soliqlar</div>
                <div className="stat-value text-danger">{data.totalDeductionPct || 0}%</div>
                <div className="text-xs text-text-muted mt-1">{fmtShort(Math.round(data.monthlyRevenueUzs * (data.totalDeductionPct || 0) / 100))} so&apos;m/oy</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Oylik soliqlar</div>
                <div className="stat-value text-danger">{fmtShort(Math.round(data.monthlyRevenueUzs * (data.totalDeductionPct || 0) / 100))}</div>
                <div className="text-xs text-text-muted mt-1">so&apos;m</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Taqsimlangan daromad</div>
                <div className="stat-value text-green">{fmtShort(data.totalDistributed || 0)}</div>
                <div className="text-xs text-text-muted mt-1">jami</div>
              </div>
            </div>
          </div>

          {/* Row 4: Fond va ulush */}
          <div className="mt-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Fond va ulush</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-box">
                <div className="stat-label">Umumiy investor fondi</div>
                <div className="stat-value">{fmtShort(data.totalInvested)}</div>
                <div className="text-xs text-text-muted mt-1">so&apos;m</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Fond maqsadi</div>
                <div className="stat-value">{fmtShort(data.campaignTarget)}</div>
                <div className="text-xs text-text-muted mt-1">{data.campaignProgress}% to&apos;lgan</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Sizning ulush</div>
                <div className="stat-value text-accent">{data.poolSharePct.toFixed(2)}%</div>
                <div className="text-xs text-text-muted mt-1">{data.investorPoolPct}% fonddan</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Investorlar soni</div>
                <div className="stat-value">{data.investorCount}</div>
                <div className="text-xs text-text-muted mt-1">faol</div>
              </div>
            </div>
          </div>

          {/* Fond progress bar */}
          <div className="card-elevated mt-4">
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-text-secondary font-bold">Fond holati</span>
              <span className="font-bold text-accent">{data.campaignProgress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.max(Math.min(data.campaignProgress, 100), 1)}%` }} />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-text-muted">
              <span>{fmtShort(data.totalInvested)} yig&apos;ildi</span>
              <span>{fmtShort(data.campaignTarget)} maqsad</span>
            </div>
          </div>

          {/* Keyingi taqsimot */}
          <div className="card-elevated mt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Keyingi taqsimot</div>
                <div className="text-lg font-bold mt-1">{data.nextDistributionDate ? formatDate(data.nextDistributionDate) : "—"}</div>
                <div className="text-xs text-text-muted mt-0.5">Har oyning 25-sanasi soat 08:00 da avtomatik</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-muted">Yillik ROI</div>
                <div className="text-2xl font-bold text-gold">{roi.toFixed(1)}%</div>
              </div>
            </div>
            {data.lastDistributionMonth && data.lastDistributionData && (
              <div className="mt-3 pt-3 border-t border-border-light">
                <div className="text-xs text-text-muted mb-2">Oxirgi taqsimot: {data.lastDistributionMonth}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-bg border border-border">
                    <span className="text-text-muted">Oylik daromad</span>
                    <span className="font-mono font-bold">{fmtShort(data.lastDistributionData.monthlyRevenue)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-bg border border-border">
                    <span className="text-text-muted">Toza summa</span>
                    <span className="font-mono font-bold text-green">{fmtShort(data.lastDistributionData.netRevenue)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Daromad taqsimoti tafsiloti */}
          <div className="card-elevated mt-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Daromad taqsimoti tafsiloti</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                <span className="text-sm text-text-muted">Oylik jami daromad</span>
                <span className="font-mono font-bold">{fmtMoney(data.monthlyRevenueUzs)} so&apos;m</span>
              </div>

              {data.deductions && data.totalDeductionPct != null && data.totalDeductionPct > 0 && (() => {
                const rev = data.monthlyRevenueUzs;
                const d = data.deductions;
                return (
                  <>
                    <div className="text-xs font-bold text-text-muted uppercase tracking-wider mt-2">Chegirmalar ({data.totalDeductionPct}%)</div>
                    {d.taxPercent > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5 border border-danger/10 text-sm">
                        <span className="text-danger">− Soliq ({d.taxPercent}%)</span>
                        <span className="font-mono text-danger">−{fmtMoney(Math.round(rev * d.taxPercent / 100))} so&apos;m</span>
                      </div>
                    )}
                    {d.commissionPercent > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5 border border-danger/10 text-sm">
                        <span className="text-danger">− Komissiya ({d.commissionPercent}%)</span>
                        <span className="font-mono text-danger">−{fmtMoney(Math.round(rev * d.commissionPercent / 100))} so&apos;m</span>
                      </div>
                    )}
                    {d.serverCostPercent > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5 border border-danger/10 text-sm">
                        <span className="text-danger">− Server ({d.serverCostPercent}%)</span>
                        <span className="font-mono text-danger">−{fmtMoney(Math.round(rev * d.serverCostPercent / 100))} so&apos;m</span>
                      </div>
                    )}
                    {d.otherPercent > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5 border border-danger/10 text-sm">
                        <span className="text-danger">− Boshqa ({d.otherPercent}%)</span>
                        <span className="font-mono text-danger">−{fmtMoney(Math.round(rev * d.otherPercent / 100))} so&apos;m</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-3 rounded-lg bg-green/5 border border-green/20 font-bold">
                      <span className="text-sm text-green">= Toza summa</span>
                      <span className="font-mono text-green">{fmtMoney(data.netMonthlyRevenue || 0)} so&apos;m</span>
                    </div>
                  </>
                );
              })()}

              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mt-2">Taqsimot</div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                <span className="text-sm text-text-muted">Investorlar fondiga ({data.investorPoolPct}%)</span>
                <span className="font-mono font-bold text-accent">{fmtMoney(Math.round((data.netMonthlyRevenue || data.monthlyRevenueUzs) * data.investorPoolPct / 100))} so&apos;m</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-accent/30">
                <span className="text-sm text-text-muted">Sizning ulushingiz ({data.poolSharePct.toFixed(2)}%)</span>
                <span className="font-mono font-bold text-accent">{fmtMoney(data.netMonthlyProfit || data.monthlyProfit)} so&apos;m</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border-light flex justify-between text-sm">
              <span className="text-text-muted">Yillik prognoz</span>
              <span className="font-mono font-bold text-gold">{fmtMoney(data.netYearlyProfit || data.yearlyProfit)} so&apos;m</span>
            </div>
          </div>

          {/* Balans va Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Balans */}
            <div className="card-elevated">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Balans</div>
              <div className="text-2xl font-bold text-green">{fmtMoney(data.balance || 0)} <span className="text-sm font-normal text-text-muted">so&apos;m</span></div>
              <p className="text-xs text-text-muted mt-2">Pul yechish yoki reinvest qilish mumkin</p>
              <button onClick={() => setActiveTab("balance")} className="text-xs text-accent hover:underline mt-2 block">Batafsil →</button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Balans", tab: "balance" as Tab, icon: "💰" },
                { label: "Investorlar", tab: "investors" as Tab, icon: "👥" },
                { label: "Sarflar", tab: "expenses" as Tab, icon: "📋" },
                { label: "Tarix", tab: "history" as Tab, icon: "📊" },
              ].map((a) => (
                <button key={a.tab} onClick={() => setActiveTab(a.tab)}
                  className="card text-left hover:border-accent transition-colors p-3">
                  <div className="text-lg mb-1">{a.icon}</div>
                  <div className="text-sm font-bold text-text-secondary">{a.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bildirishnomalar */}
          {notifications.length > 0 && (
            <div className="card mt-6">
              <div className="flex justify-between items-center mb-3">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Bildirishnomalar</div>
                {unreadCount > 0 && (
                  <button onClick={markNotificationsRead} className="text-xs text-accent hover:underline">
                    Hammasini o&apos;qildi
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg border ${n.isRead ? "bg-bg border-border" : "bg-accent/5 border-accent/20"}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? "bg-border" : "bg-accent"}`} />
                    <div className="flex-1">
                      <div className="text-sm font-bold">{n.title}</div>
                      <div className="text-xs text-text-muted">{n.message}</div>
                      <div className="text-xs text-text-muted mt-0.5">{formatDateTime(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sarflar xulosa */}
          {expenses.length > 0 && (
            <div className="card mt-4">
              <div className="flex justify-between items-center mb-3">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Oxirgi sarflar</div>
                <button onClick={() => setActiveTab("expenses")} className="text-xs text-accent hover:underline">Barchasini ko&apos;rish →</button>
              </div>
              <div className="space-y-2">
                {expenses.slice(0, 3).map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{exp.title}</div>
                      <div className="text-xs text-text-muted">{fmtMoney(exp.amount)} so&apos;m · {formatDate(exp.createdAt)}</div>
                    </div>
                    <span className={`badge flex-shrink-0 ml-2 ${exp.status === "voting" ? "badge-gold" : exp.status === "approved" ? "badge-live" : exp.status === "completed" ? "badge-section" : "badge-offline"}`}>
                      {exp.status === "voting" ? "Ovoz" : exp.status === "approved" ? "Tasdiqlandi" : exp.status === "completed" ? "Bajarildi" : "Rad"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* ═══════ PORTFOLIO TAB ═══════ */}
      {activeTab === "portfolio" && (
        <div className="mt-6">
          <span className="badge badge-section">Portfel</span>
          <h2 className="text-2xl font-bold tracking-tight">Loyihalar portfeli</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Investitsiyangiz {projectCount} ta loyihada ishlatilmoqda</p>

          {/* Project tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            <button onClick={() => setSelectedProject(null)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${!selectedProject ? "bg-accent text-white" : "bg-bg border border-border text-text-secondary hover:border-accent"}`}>
              Hammasi
            </button>
            {data.projects.map((p) => (
              <button key={p.key} onClick={() => setSelectedProject(p.key)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${selectedProject === p.key ? "bg-accent text-white" : "bg-bg border border-border text-text-secondary hover:border-accent"}`}>
                <span className={`w-2 h-2 rounded-full ${projectStateDot(p.state)}`} />
                {p.name}
              </button>
            ))}
          </div>

          {/* All projects summary or single project detail */}
          {!selectedProject ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.projects.map((p) => (
                  <button key={p.key} onClick={() => setSelectedProject(p.key)}
                    className="card text-left hover:border-accent transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${projectStateDot(p.state)}`} />
                      <span className="text-xs font-bold text-text-muted uppercase">{projectStateLabel(p.state)}</span>
                    </div>
                    <div className="text-sm font-bold mb-1">{p.name}</div>
                    <div className="text-lg font-bold text-accent">{fmtShort(p.monthlyRevenueUzs)}</div>
                    <div className="text-xs text-text-muted">so&apos;m/oy</div>
                    <div className="flex gap-3 mt-2 text-xs text-text-muted">
                      <span>{p.activeClients} mijoz</span>
                      <span>+{p.newClients30d} yangi</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Projects table */}
              <div className="card p-0 overflow-hidden mt-4">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Loyiha</th>
                        <th>Holat</th>
                        <th>Pullik</th>
                        <th>Bepul</th>
                        <th>Yangi (30k)</th>
                        <th className="text-right">Oylik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.projects.length > 0 ? data.projects.map((p) => (
                        <tr key={p.key} className="cursor-pointer hover:bg-accent/5" onClick={() => setSelectedProject(p.key)}>
                          <td className="font-bold">{p.name}</td>
                          <td>
                            <span className={`badge ${projectStateBadge(p.state)}`}>
                              {projectStateLabel(p.state)}
                            </span>
                          </td>
                          <td className="font-mono">{p.paidUsers}</td>
                          <td className="font-mono">{p.freeUsers}</td>
                          <td className="font-mono text-green">+{p.newClients30d}</td>
                          <td className="text-right font-mono font-bold text-accent">{fmtShort(p.monthlyRevenueUzs)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="text-center text-text-muted">Yuklanmoqda...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (() => {
            const p = data.projects.find(pr => pr.key === selectedProject);
            if (!p) return <div className="card-elevated text-center py-10 text-text-muted">Loyiha topilmadi</div>;
            const totalMonthly = data.projects.reduce((s, pr) => s + pr.monthlyRevenueUzs, 0);
            const sharePct = totalMonthly > 0 ? (p.monthlyRevenueUzs / totalMonthly * 100) : 0;
            return (
              <div className="space-y-4">
                {/* Project header */}
                <div className="card-elevated">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${projectStateDot(p.state)}`} />
                      <h3 className="text-xl font-bold">{p.name}</h3>
                      <span className={`badge ${projectStateBadge(p.state)}`}>
                        {projectStateLabel(p.state)}
                      </span>
                    </div>
                    {p.lastSync && <div className="text-xs text-text-muted">Oxirgi sync: {formatDateTime(p.lastSync)}</div>}
                  </div>

                  {/* Main stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-bg border border-border text-center">
                      <div className="text-xs text-text-muted mb-1">Oylik daromad</div>
                      <div className="text-lg font-bold text-accent">{fmtShort(p.monthlyRevenueUzs)}</div>
                      <div className="text-xs text-text-muted">so&apos;m</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg border border-border text-center">
                      <div className="text-xs text-text-muted mb-1">Haftalik</div>
                      <div className="text-lg font-bold">{fmtShort(p.weeklyRevenue)}</div>
                      <div className="text-xs text-text-muted">so&apos;m</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg border border-border text-center">
                      <div className="text-xs text-text-muted mb-1">Kunlik</div>
                      <div className="text-lg font-bold">{fmtShort(p.dailyRevenue)}</div>
                      <div className="text-xs text-text-muted">so&apos;m</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg border border-border text-center">
                      <div className="text-xs text-text-muted mb-1">Jami daromad</div>
                      <div className="text-lg font-bold text-gold">{fmtShort(p.totalRevenue)}</div>
                      <div className="text-xs text-text-muted">so&apos;m</div>
                    </div>
                  </div>
                </div>

                {/* Users stats */}
                <div className="card">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Foydalanuvchilar</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-bg border border-border">
                      <div className="text-xs text-text-muted">Pullik mijozlar</div>
                      <div className="text-xl font-bold text-accent">{p.paidUsers}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg border border-border">
                      <div className="text-xs text-text-muted">Bepul foydalanuvchilar</div>
                      <div className="text-xl font-bold">{p.freeUsers}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg border border-border">
                      <div className="text-xs text-text-muted">Yangi mijozlar (30 kun)</div>
                      <div className="text-xl font-bold text-green">+{p.newClients30d}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-bg border border-border">
                      <div className="text-xs text-text-muted">Bugungi sync</div>
                      <div className="text-xl font-bold">{p.syncEventsToday}</div>
                    </div>
                  </div>
                </div>

                {/* Revenue share bar */}
                <div className="card">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Umumiy daromaddagi ulushi</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${Math.min(sharePct, 100)}%` }} />
                      </div>
                    </div>
                    <span className="font-mono font-bold text-accent text-sm">{sharePct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-text-muted mt-2">{p.name} ning umumiy daromad ichidagi hissasi</div>
                </div>

                {/* Revenue chart (simple CSS bar chart) */}
                <div className="card">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Daromad solishtirma</div>
                  <div className="space-y-2">
                    {data.projects.map((pr) => {
                      const maxRev = Math.max(...data.projects.map(x => x.monthlyRevenueUzs), 1);
                      const w = (pr.monthlyRevenueUzs / maxRev) * 100;
                      return (
                        <div key={pr.key} className="flex items-center gap-3">
                          <div className="w-24 text-xs font-bold text-text-secondary truncate">{pr.name}</div>
                          <div className="flex-1">
                            <div className="h-6 bg-bg rounded-full overflow-hidden border border-border">
                              <div
                                className={`h-full rounded-full transition-all ${pr.key === selectedProject ? "bg-accent" : "bg-border"}`}
                                style={{ width: `${Math.max(w, 2)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-xs font-mono font-bold w-20 text-right">{fmtShort(pr.monthlyRevenueUzs)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Ulush hisob-kitobi */}
          <div className="card-elevated mt-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Sizning ulushingiz hisob-kitobi</div>
            <div className="space-y-2">
              {[
                { label: "Sizning investitsiyangiz", value: `${fmtMoney(data.investmentAmountUzs)} so'm` },
                { label: "Jami fond", value: `${fmtMoney(data.totalInvested)} so'm` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                  <span className="text-text-muted">{r.label}</span>
                  <span className="font-mono font-bold">{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                <span className="text-text-muted">Fond ichidagi ulush</span>
                <span className="font-mono font-bold">{data.totalInvested > 0 ? ((data.investmentAmountUzs / data.totalInvested) * 100).toFixed(2) : 0}%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                <span className="text-text-muted">× Investor fondi</span>
                <span className="font-mono font-bold">{data.investorPoolPct}%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-accent/30 text-sm">
                <span className="text-accent font-bold">= Sizning daromad ulushi</span>
                <span className="font-mono font-bold text-accent">{data.poolSharePct.toFixed(2)}%</span>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-3">Yangi investor qo&apos;shilganda ulushlar avtomatik qayta hisoblanadi</p>
          </div>

          {/* Daromad prognozi */}
          <div className="card mt-6 p-0 overflow-hidden">
            <div className="p-5 pb-0">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Daromad prognozi</div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Davr</th>
                  <th className="text-right">Kutilgan daromad</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Oylik", val: data.netMonthlyProfit || data.monthlyProfit },
                  { label: "Choraklik (3 oy)", val: (data.netMonthlyProfit || data.monthlyProfit) * 3 },
                  { label: "Yarim yillik (6 oy)", val: (data.netMonthlyProfit || data.monthlyProfit) * 6 },
                  { label: "Yillik (12 oy)", val: data.netYearlyProfit || data.yearlyProfit },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="text-text-secondary">{row.label}</td>
                    <td className="text-right font-mono font-bold">{fmtMoney(Math.round(row.val))} so&apos;m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ INVESTORS TAB ═══════ */}
      {activeTab === "investors" && (
        <div className="mt-6">
          <span className="badge badge-section">Investorlar</span>
          <h2 className="text-2xl font-bold tracking-tight">Investorlar ro&apos;yxati</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Faol investorlar va ulushlar</p>

          {investorsList.length > 0 ? (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Investor</th>
                      <th>Investitsiya</th>
                      <th>Ulush</th>
                      <th>Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investorsList.map((inv, i) => (
                      <tr key={i} className={inv.isMe ? "bg-accent/5" : ""}>
                        <td className="font-mono">{inv.isMe ? <span className="text-accent font-bold">Siz</span> : `···${inv.phoneLast4}`}</td>
                        <td className="font-mono font-bold">{fmtMoney(inv.investmentAmount)} so&apos;m</td>
                        <td className="font-mono text-accent">{inv.sharePercent.toFixed(2)}%</td>
                        <td className="text-text-muted">{formatDate(inv.joinedDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card-elevated text-center py-12">
              <p className="text-text-secondary text-sm">Hali faol investorlar yo&apos;q</p>
            </div>
          )}

          {investorsList.length > 0 && (
            <div className="card-elevated mt-6">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Umumiy</div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                <span className="text-text-muted">Jami faol investorlar</span>
                <span className="font-bold">{investorsList.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm mt-2">
                <span className="text-text-muted">Jami investitsiya</span>
                <span className="font-mono font-bold text-accent">{fmtMoney(investorsList.reduce((s, v) => s + v.investmentAmount, 0))} so&apos;m</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ BALANCE TAB ═══════ */}
      {activeTab === "balance" && (
        <div className="mt-6">
          <span className="badge badge-section">Balans</span>
          <h2 className="text-2xl font-bold tracking-tight">Balans boshqaruvi</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Balansdan istalgan vaqtda pul yeching yoki reinvest qiling</p>

          {/* Balans stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-box text-center">
              <div className="stat-label">Balans</div>
              <div className="stat-value text-base text-green">{fmtMoney(data.balance || 0)}</div>
              <div className="text-xs text-text-muted mt-1">so&apos;m</div>
            </div>
            <div className="stat-box text-center">
              <div className="stat-label">Investitsiya</div>
              <div className="stat-value text-base text-accent">{fmtShort(data.investmentAmountUzs)}</div>
              <div className="text-xs text-text-muted mt-1">so&apos;m</div>
            </div>
            <div className="stat-box text-center">
              <div className="stat-label">Keyingi taqsimot</div>
              <div className="stat-value text-base">{data.nextDistributionDate ? formatDate(data.nextDistributionDate) : "—"}</div>
            </div>
          </div>

          {/* Balansdan yechish */}
          <div className="card-elevated mt-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Balansdan pul yechish</div>
            <p className="text-sm text-text-secondary mb-4">Balansdan istalgan vaqtda, hech qanday tasdiqlashsiz pul yeching.</p>
            {balWdMsg && <div className="text-sm p-3 rounded-xl mb-3 bg-green/5 text-green border border-green/20">{balWdMsg}</div>}
            <form onSubmit={handleBalanceWithdraw} className="space-y-3">
              <div>
                <label className="stat-label">Miqdor (so&apos;m)</label>
                <input type="number" value={balWdAmount} onChange={(e) => setBalWdAmount(e.target.value)} placeholder="100000" min="10000"
                  max={data.balance || 0} className="calc-input text-sm !font-normal" />
              </div>
              <div>
                <label className="stat-label">Bank nomi</label>
                <input type="text" value={balWdBank} onChange={(e) => setBalWdBank(e.target.value)} placeholder="Uzcard, Humo..."
                  className="calc-input text-sm !font-normal" />
              </div>
              <div>
                <label className="stat-label">Karta raqami</label>
                <input type="text" value={balWdCard} onChange={(e) => setBalWdCard(e.target.value)} placeholder="8600 1234 5678 9012"
                  className="calc-input text-sm !font-normal" />
              </div>
              <button type="submit" disabled={balWdLoading || !balWdAmount || !balWdCard || Number(balWdAmount) > (data.balance || 0)}
                className="btn-primary w-full py-3 disabled:opacity-40">
                {balWdLoading ? "Yechilmoqda..." : "Pul yechish"}
              </button>
            </form>
          </div>

          {/* Reinvest */}
          <div className="card-elevated mt-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Reinvest qilish</div>
            <p className="text-sm text-text-secondary mb-4">
              Balansdagi pulni asosiy kapitalga o&apos;tkazing. Ulushingiz oshadi, daromadingiz ko&apos;payadi. Hech qanday tasdiqlash kerak emas.
            </p>
            {reinvestMsg && <div className="text-sm p-3 rounded-xl mb-3 bg-green/5 text-green border border-green/20">{reinvestMsg}</div>}
            <form onSubmit={handleReinvest} className="space-y-3">
              <div>
                <label className="stat-label">Reinvest miqdori (so&apos;m)</label>
                <input type="number" value={reinvestAmount} onChange={(e) => setReinvestAmount(e.target.value)} placeholder="500000" min="100000"
                  max={data.balance || 0} className="calc-input text-sm !font-normal" />
              </div>
              {Number(reinvestAmount) > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                    <span className="text-text-muted">Hozirgi investitsiya</span>
                    <span className="font-mono font-bold">{fmtMoney(data.investmentAmountUzs)} so&apos;m</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm text-green">
                    <span>+ Reinvest</span>
                    <span className="font-mono font-bold">+{fmtMoney(Number(reinvestAmount))} so&apos;m</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-accent/30 text-sm text-accent">
                    <span className="font-bold">Yangi investitsiya</span>
                    <span className="font-mono font-bold">{fmtMoney(data.investmentAmountUzs + Number(reinvestAmount))} so&apos;m</span>
                  </div>
                </div>
              )}
              <button type="submit" disabled={reinvestLoading || !reinvestAmount || Number(reinvestAmount) < 100_000 || Number(reinvestAmount) > (data.balance || 0)}
                className="btn-primary w-full py-3 disabled:opacity-40">
                {reinvestLoading ? "Reinvest qilinmoqda..." : "Reinvest qilish"}
              </button>
            </form>
          </div>

          {/* Yechish tarixi */}
          {data.withdrawals.length > 0 && (
            <div className="card mt-6 p-0 overflow-hidden">
              <div className="p-5 pb-0">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Yechish tarixi</div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Miqdor</th>
                    <th>Sana</th>
                    <th className="text-right">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="font-mono font-bold">-{fmtMoney(w.amount)} so&apos;m</td>
                      <td className="text-text-muted">{formatDate(w.createdAt)} · {w.bankName || "Karta"} ···{w.cardNumber.slice(-4)}</td>
                      <td className="text-right">
                        <span className={`badge ${w.status === "completed" ? "badge-live" : w.status === "rejected" ? "badge-offline" : "badge-gold"}`}>
                          {w.status === "completed" ? "Bajarildi" : w.status === "rejected" ? "Rad" : "Kutilmoqda"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════ EXPENSES TAB ═══════ */}
      {activeTab === "expenses" && (
        <div className="mt-6">
          <span className="badge badge-section">Sarflar</span>
          <h2 className="text-2xl font-bold tracking-tight">Sarf takliflari va ovoz berish</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Admin tomonidan kiritilgan sarflar. Ko&apos;pchilik ovozi bilan tasdiqlanadi.</p>

          {expenses.length > 0 ? (
            <div className="space-y-4">
              {expenses.map((exp) => {
                const statusBadge = exp.status === "voting" ? "badge-gold" : exp.status === "approved" ? "badge-live" : exp.status === "completed" ? "badge-section" : "badge-offline";
                const statusLabel = exp.status === "voting" ? "Ovoz berilmoqda" : exp.status === "approved" ? "Tasdiqlandi" : exp.status === "completed" ? "Bajarildi" : "Rad etildi";
                const canVote = data.status === "active" && exp.status === "voting";
                const majority = Math.floor(exp.totalVoters / 2) + 1;
                return (
                  <div key={exp.id} className="card">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold">{exp.title}</h3>
                        {exp.description && <p className="text-sm text-text-secondary mt-0.5">{exp.description}</p>}
                      </div>
                      <span className={`badge ${statusBadge} flex-shrink-0 ml-2`}>{statusLabel}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <span className="font-mono font-bold text-accent">{fmtMoney(exp.amount)} so&apos;m</span>
                      <span className="text-text-muted">{formatDate(exp.createdAt)}</span>
                    </div>

                    {/* Ovoz natijasi */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-bg border border-border text-sm">
                      <span className="text-green font-bold">✓ {exp.yesVotes}</span>
                      <span className="text-danger font-bold">✕ {exp.noVotes}</span>
                      <span className="text-text-muted">/ {exp.totalVoters} ta investor</span>
                      <span className="text-text-muted text-xs">(ko&apos;pchilik: {majority})</span>
                    </div>

                    {/* Ovoz berish tugmalari */}
                    {canVote && (
                      <div className="flex gap-3 mt-3">
                        {exp.myVote === "yes" ? (
                          <span className="text-sm text-green font-bold p-2">✓ Siz &quot;Ha&quot; dedingiz</span>
                        ) : (
                          <button disabled={!!voteLoading} onClick={() => handleVote(exp.id, "yes")}
                            className="btn-primary py-2 px-4 text-sm flex-1 disabled:opacity-40">
                            {voteLoading === exp.id ? "..." : "Ha ✓"}
                          </button>
                        )}
                        {exp.myVote === "no" ? (
                          <span className="text-sm text-danger font-bold p-2">✕ Siz &quot;Yo&apos;q&quot; dedingiz</span>
                        ) : (
                          <button disabled={!!voteLoading} onClick={() => handleVote(exp.id, "no")}
                            className="btn-secondary py-2 px-4 text-sm flex-1 text-danger hover:!text-danger disabled:opacity-40">
                            {voteLoading === exp.id ? "..." : "Yo'q ✕"}
                          </button>
                        )}
                      </div>
                    )}

                    {exp.myVote && exp.status !== "voting" && (
                      <div className="text-xs text-text-muted mt-2">Sizning ovozingiz: {exp.myVote === "yes" ? "Ha ✓" : "Yo'q ✕"}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-elevated text-center py-12">
              <p className="text-text-secondary text-sm">Hali sarf takliflari yo&apos;q</p>
              <p className="text-text-muted text-xs mt-1">Admin sarf taklifi kiritganda bu yerda ko&apos;rinadi</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ ADD INVESTMENT TAB ═══════ */}
      {activeTab === "invest" && (
        <div className="mt-6">
          <span className="badge badge-section">Qo&apos;shimcha investitsiya</span>
          <h2 className="text-2xl font-bold tracking-tight">Investitsiyani oshiring</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Ko&apos;proq investitsiya — ko&apos;proq ulush va daromad</p>

          {/* Joriy holat */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-box text-center">
              <div className="stat-label">Joriy investitsiya</div>
              <div className="stat-value text-base">{fmtShort(data.investmentAmountUzs)}</div>
            </div>
            <div className="stat-box text-center">
              <div className="stat-label">Joriy ulush</div>
              <div className="stat-value text-base text-accent">{data.poolSharePct.toFixed(2)}%</div>
            </div>
            <div className="stat-box text-center">
              <div className="stat-label">Oylik daromad</div>
              <div className="stat-value text-base text-accent">{fmtShort(data.monthlyProfit)}</div>
            </div>
          </div>

          {!showAddForm ? (
            <div className="card-elevated mt-6 text-center">
              <h3 className="text-lg font-bold mb-2">Qo&apos;shimcha mablag&apos; kiriting</h3>
              <p className="text-sm text-text-secondary mb-5">Ulushingizni oshiring. Minimal: 100,000 so&apos;m.</p>
              <div className="flex flex-wrap justify-center gap-2 mb-5">
                {[1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000].map((amt) => (
                  <button key={amt} onClick={() => { setAddAmount(String(amt)); setShowAddForm(true); }}
                    className="calc-preset">
                    + {fmtShort(amt)}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddForm(true)} className="btn-primary">
                Boshqa miqdor kiritish
              </button>
            </div>
          ) : (
            <div className="card mt-6">
              <h3 className="text-lg font-bold mb-4">Qo&apos;shimcha investitsiya</h3>
              <form onSubmit={handleAddInvestment} className="space-y-4">
                <div>
                  <label className="stat-label">Miqdor (so&apos;m)</label>
                  <input type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="1000000" min="100000"
                    className="calc-input text-sm !font-normal" />
                </div>
                {Number(addAmount) > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                      <span className="text-text-muted">Hozirgi investitsiya</span>
                      <span className="font-mono font-bold">{fmtMoney(data.investmentAmountUzs)} so&apos;m</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm text-green">
                      <span>+ Qo&apos;shimcha</span>
                      <span className="font-mono font-bold">+{fmtMoney(Number(addAmount))} so&apos;m</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                      <span className="font-bold">Yangi jami</span>
                      <span className="font-mono font-bold">{fmtMoney(data.investmentAmountUzs + Number(addAmount))} so&apos;m</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-accent/30 text-sm text-accent">
                      <span className="font-bold">Yangi ulush</span>
                      <span className="font-mono font-bold">{data.totalInvested + Number(addAmount) > 0 ? (((data.investmentAmountUzs + Number(addAmount)) / (data.totalInvested + Number(addAmount))) * data.investorPoolPct).toFixed(2) : 0}%</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={addLoading || !addAmount || Number(addAmount) < 100_000} className="btn-primary flex-1 py-3 disabled:opacity-40">
                    {addLoading ? "Saqlanmoqda..." : "Investitsiyani tasdiqlash"}
                  </button>
                  <button type="button" onClick={() => { setShowAddForm(false); setAddAmount(""); }} className="btn-secondary py-3">Bekor</button>
                </div>
              </form>
            </div>
          )}

          {/* To'lov rekvizitlari */}
          <div className="card-elevated mt-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">To&apos;lov rekvizitlari</div>
            <div className="space-y-1.5">
              {[
                { label: "Oluvchi", value: `YaTT ${OWNER.fullName}` },
                { label: "Bank", value: OWNER.bank },
                { label: "Hisob raqam", value: OWNER.hisob, mono: true },
                { label: "MFO", value: OWNER.mfo, mono: true },
                { label: "INN", value: OWNER.inn, mono: true },
              ].map((r) => (
                <div key={r.label} className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                  <span className="text-text-muted">{r.label}</span>
                  <span className={`font-bold ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ CONTRACT TAB ═══════ */}
      {activeTab === "contract" && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="badge badge-section">Shartnoma</span>
              <h2 className="text-2xl font-bold tracking-tight">Investitsiya shartnomasi</h2>
            </div>
            <span className="text-xs font-mono text-text-muted">{data.contractId}</span>
          </div>

          <div className="card">
            {/* Contract Preview */}
            <div className="border border-border-light rounded-xl p-6 bg-[#fafafa] font-serif text-[12px] leading-[1.6] max-h-[600px] overflow-y-auto">
              <div className="text-center mb-4">
                <h2 className="text-[15px] font-bold uppercase tracking-wider">INVESTITSIYA SHARTNOMASI</h2>
                <div className="text-[11px] italic text-text-muted mt-1">№ {data.contractId}</div>
                <div className="h-px bg-border mt-3" />
              </div>

              <div className="space-y-3">
                <section>
                  <h3 className="font-bold uppercase text-[11.5px] border-b border-border-light pb-1 mb-2">1. Tomonlar</h3>
                  <p><strong>Loyiha rahbari:</strong> YaTT {OWNER.fullName}, guvohnoma №{OWNER.guvohnoma} ({OWNER.guvohnomaDate}), JSHSHIR: {OWNER.jshshir}</p>
                  <p><strong>Investor:</strong> {data.fullName}, passport: {data.passportSeries} {data.passportNumber}, tel: {data.phone}</p>
                </section>

                <section>
                  <h3 className="font-bold uppercase text-[11.5px] border-b border-border-light pb-1 mb-2">2. Shartnoma predmeti</h3>
                  <p>Investor {fmtMoney(data.investmentAmountUzs)} so&apos;m miqdorida mablag&apos;ni FathGroup loyihalarini rivojlantirish maqsadida investitsiya qiladi. Investitsiya qaytarilmaydigan xarakter kasb etadi — investor buning o&apos;rniga toza foydadan proporsional ulush olish huquqiga ega.</p>
                </section>

                <section>
                  <h3 className="font-bold uppercase text-[11.5px] border-b border-border-light pb-1 mb-2">3. Foyda taqsimoti</h3>
                  <p>Toza oylik daromadning <strong>20%</strong> Loyiha rahbariga, <strong>80%</strong> investorlar fondiga. Investor ulushi: <strong>{data.poolSharePct.toFixed(2)}%</strong>.</p>
                </section>

                <section>
                  <h3 className="font-bold uppercase text-[11.5px] border-b border-border-light pb-1 mb-2">4. To&apos;lov tartibi</h3>
                  <p>Oylik foyda har oyning 25-sanasigacha hisoblanadi va 5 ish kuni ichida bank o&apos;tkazmasi orqali to&apos;lanadi.</p>
                </section>

                <section>
                  <h3 className="font-bold uppercase text-[11.5px] border-b border-border-light pb-1 mb-2">5. Muddat va chiqish tartibi</h3>
                  <p>12 oy, 30 kun oldin yozma xabarsiz avtomatik uzayadi. Investor istalgan vaqtda o&apos;z ulushini boshqa shaxsga sotishi mumkin. FathGroup ham ulushni sotib olish huquqiga ega. Investitsiya loyiha hisobidan qaytarilmaydi.</p>
                </section>

                <section>
                  <h3 className="font-bold uppercase text-[11.5px] border-b border-border-light pb-1 mb-2">6. Rekvizitlar</h3>
                  <div className="grid grid-cols-2 gap-4 text-[11px]">
                    <div>
                      <p className="font-bold">LOYIHA RAHBARI:</p>
                      <p>YaTT {OWNER.fullName}</p>
                      <p>JSHSHIR: {OWNER.jshshir}</p>
                      <p>Bank: {OWNER.bank}</p>
                      <p>H/r: {OWNER.hisob}</p>
                      <p>MFO: {OWNER.mfo}, INN: {OWNER.inn}</p>
                    </div>
                    <div>
                      <p className="font-bold">INVESTOR:</p>
                      <p>{data.fullName}</p>
                      <p>Passport: {data.passportSeries} {data.passportNumber}</p>
                      <p>Tel: {data.phone}</p>
                      {data.email && <p>Email: {data.email}</p>}
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-4 pt-3 border-t border-border text-center text-[9px] text-text-muted">
                SHA-256: {data.contractHash} • №{data.contractId}
              </div>
            </div>

            {/* Download button */}
            <div className="mt-5">
              <button onClick={() => {
                const w = window.open("", "_blank");
                if (!w) return;
                w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shartnoma ${data.contractId}</title><style>
                  * { margin:0; padding:0; box-sizing:border-box; }
                  body { font-family:'Times New Roman',serif; font-size:12px; line-height:1.6; padding:24px 32px; color:#1a1a1a; max-width:800px; margin:0 auto; }
                  h2 { text-align:center; font-size:15px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
                  h3 { font-size:12px; text-transform:uppercase; margin-top:10px; margin-bottom:4px; padding-bottom:2px; border-bottom:1px solid #ddd; }
                  p { margin-bottom:3px; text-align:justify; }
                  .header { text-align:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1.5px solid #1a1a1a; }
                  .sigs { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:14px; padding-top:10px; border-top:1px solid #ccc; }
                  .sig-line { border-bottom:1px solid #1a1a1a; height:28px; margin-bottom:2px; }
                  .rekvizitlar { display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:11px; }
                  @media print { body { padding:16px; } }
                </style></head><body>
                <div class="header"><h2>INVESTITSIYA SHARTNOMASI</h2><div style="font-size:11px;color:#555;">№ ${data.contractId}</div></div>
                <h3>1. TOMONLAR</h3>
                <p><strong>Loyiha rahbari:</strong> YaTT ${OWNER.fullName}, guvohnoma №${OWNER.guvohnoma}, JSHSHIR: ${OWNER.jshshir}</p>
                <p><strong>Investor:</strong> ${data.fullName}, passport: ${data.passportSeries} ${data.passportNumber}, tel: ${data.phone}</p>
                <h3>2. SHARTNOMA PREDMETI</h3>
                <p>Investor ${fmtMoney(data.investmentAmountUzs)} so'm miqdorida mablag'ni ${projectCount} ta platformani rivojlantirish maqsadida beradi.</p>
                <h3>3. FOYDA TAQSIMOTI</h3>
                <p>20% Loyiha rahbariga, 80% investorlar fondiga. Investor ulushi: ${data.poolSharePct.toFixed(2)}%.</p>
                <h3>4. TO'LOV TARTIBI</h3><p>Har oyning 25-sanasigacha hisoblanadi, 5 ish kuni ichida to'lanadi.</p>
                <h3>5. MUDDAT</h3><p>12 oy, avtomatik uzayadi. Bekor qilish — 60 kun oldin yozma bildirishnoma.</p>
                <h3>6. REKVIZITLAR</h3>
                <div class="rekvizitlar"><div><p><strong>LOYIHA RAHBARI:</strong></p><p>YaTT ${OWNER.fullName}</p><p>JSHSHIR: ${OWNER.jshshir}</p><p>Bank: ${OWNER.bank}</p><p>H/r: ${OWNER.hisob}</p><p>MFO: ${OWNER.mfo}, INN: ${OWNER.inn}</p></div>
                <div><p><strong>INVESTOR:</strong></p><p>${data.fullName}</p><p>Passport: ${data.passportSeries} ${data.passportNumber}</p><p>Tel: ${data.phone}</p></div></div>
                <div class="sigs"><div style="text-align:center;font-size:11px"><p><strong>LOYIHA RAHBARI</strong></p><div class="sig-line"></div><p>${OWNER.fullName}</p></div>
                <div style="text-align:center;font-size:11px"><p><strong>INVESTOR</strong></p><div class="sig-line"></div><p>${data.fullName}</p></div></div>
                <div style="text-align:center;margin-top:12px;font-size:9px;color:#888;">SHA-256: ${data.contractHash} • №${data.contractId}</div>
                </body></html>`);
                w.document.close();
                setTimeout(() => w.print(), 500);
              }} className="btn-primary w-full">
                Shartnomani yuklab olish (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ HISTORY TAB ═══════ */}
      {activeTab === "history" && (
        <div className="mt-6">
          <span className="badge badge-section">Tarix</span>
          <h2 className="text-2xl font-bold tracking-tight">Tranzaksiya tarixi</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Barcha operatsiyalaringiz ro&apos;yxati</p>

          {data.transactions.length > 0 ? (
            <div className="card p-0 overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tavsif</th>
                    <th>Sana</th>
                    <th className="text-right">Miqdor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="font-bold">{tx.description}</td>
                      <td className="text-text-muted">{formatDateTime(tx.createdAt)}</td>
                      <td className={`text-right font-mono font-bold ${tx.type === "deposit" ? "text-green" : tx.type === "withdrawal" ? "text-danger" : "text-accent"}`}>
                        {tx.type === "withdrawal" ? "-" : "+"}{fmtMoney(tx.amount)} so&apos;m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card-elevated text-center py-12">
              <p className="text-text-secondary text-sm">Hali tranzaksiyalar yo&apos;q</p>
              <p className="text-text-muted text-xs mt-1">Investitsiya qo&apos;shganingizda yoki pul yechganingizda bu yerda ko&apos;rinadi</p>
            </div>
          )}

          {/* Ariza holati */}
          <div className="card-elevated mt-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Ariza holati</div>
            <div className="space-y-2">
              {[
                { step: 1, title: "Ariza yuborildi", desc: `Shartnoma №${data.contractId} imzolandi`, done: true, date: data.createdAt },
                { step: 2, title: "Admin tasdiqladi", desc: "Rekvizitlar va kontakt yuborildi", done: ["approved", "payment_uploaded", "active"].includes(data.status), date: data.approvedAt || null },
                { step: 3, title: "To'lov cheki yuborildi", desc: "Investor chekni yubordi", done: ["payment_uploaded", "active"].includes(data.status), date: data.paymentUploadedAt || null },
                { step: 4, title: "To'lov tasdiqlandi", desc: "Admin to'lovni tekshirdi", done: data.status === "active", date: data.activatedAt || null },
                { step: 5, title: "Investitsiya faol", desc: "Kabinet to'liq faoliyatda", done: data.status === "active", date: data.activatedAt || null },
              ].map((item) => {
                const isCur = !item.done && (item.step === 2 && data.status === "pending") || (item.step === 3 && data.status === "approved") || (item.step === 4 && data.status === "payment_uploaded");
                return (
                  <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg bg-bg border border-border">
                    <div className={`step-num flex-shrink-0 ${item.done ? "!bg-green" : isCur ? "animate-pulse" : "!bg-border"}`} style={{ width: 28, height: 28, fontSize: 11 }}>
                      {item.done ? "✓" : item.step}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{item.title}</div>
                      <div className="text-xs text-text-muted">{item.desc}</div>
                      {item.date && <div className="text-xs text-text-muted mt-0.5">{formatDateTime(item.date)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SETTINGS TAB ═══════ */}
      {activeTab === "settings" && (
        <div className="mt-6">
          <span className="badge badge-section">Sozlamalar</span>
          <h2 className="text-2xl font-bold tracking-tight">Shaxsiy ma&apos;lumotlar</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Akkaunt va investitsiya tafsilotlari</p>

          <div className="card">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Shaxsiy</div>
            {[
              { label: "To'liq ism", value: data.fullName },
              { label: "Telefon", value: data.phone },
              { label: "Email", value: data.email || "—" },
              { label: "Passport", value: `${data.passportSeries} ${data.passportNumber}` },
              { label: "Manzil", value: data.address || "—" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-3 border-b border-border-light last:border-0">
                <span className="text-sm text-text-muted">{row.label}</span>
                <span className="text-sm font-bold">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="card mt-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Investitsiya</div>
            {[
              { label: "Ariza ID", value: data.id },
              { label: "Shartnoma", value: data.contractId },
              { label: "Shartnoma hash", value: data.contractHash },
              { label: "Investitsiya", value: `${fmtMoney(data.investmentAmountUzs)} so'm` },
              { label: "Ulush", value: `${data.poolSharePct.toFixed(2)}%` },
              { label: "Holat", value: st.label },
              { label: "Ro'yxatdan o'tgan", value: formatDate(data.createdAt) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-3 border-b border-border-light last:border-0">
                <span className="text-sm text-text-muted">{row.label}</span>
                <span className="text-sm font-bold font-mono">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="card-elevated mt-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Aloqa</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                <span className="text-text-muted">Telefon</span>
                <a href={`tel:${OWNER.phone.replace(/\s/g, "")}`} className="text-accent">{OWNER.phone}</a>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                <span className="text-text-muted">Telegram</span>
                <a href="https://t.me/iqbolruziboyev" target="_blank" rel="noopener noreferrer" className="text-accent">@iqbolruziboyev</a>
              </div>
            </div>
          </div>

          <button onClick={handleLogout} className="btn-secondary w-full mt-6 text-danger hover:!text-danger">
            Kabinetdan chiqish
          </button>
        </div>
      )}
    </div>
  );
}
