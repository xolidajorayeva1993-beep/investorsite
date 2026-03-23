"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

/* ═══════════ TYPES ═══════════ */
type Investor = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  passportSeries: string;
  passportNumber: string;
  address: string;
  investmentAmountUzs: number;
  contractId: string;
  status: string;
  createdAt: string;
  passwordHash?: string;
  approvedAt?: string;
  activatedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paymentUploadedAt?: string;
  paymentReceiptFile?: string;
  paymentReceiptNote?: string;
  adminRequisites?: { bank: string; account: string; mfo: string; inn: string; recipient: string };
  adminContactInfo?: { phone: string; telegram: string };
  adminNote?: string;
  videoFile?: string;
  videoUploadedAt?: string;
};

type Withdrawal = {
  id: string;
  investorId: string;
  investorName: string;
  phone: string;
  amount: number;
  bankName: string;
  cardNumber: string;
  note: string;
  status: string;
  createdAt: string;
  processedAt?: string;
};

type Transaction = {
  id: string;
  investorId: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
};

type Summary = {
  totalInvestors: number;
  totalInvested: number;
  statusCounts: { pending: number; approved: number; payment_uploaded: number; active: number; rejected: number };
  pendingWithdrawals: number;
  totalWithdrawn: number;
  totalTransactions: number;
  totalExpenses: number;
  votingExpenses: number;
};

type Expense = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  deadline: string;
  status: string;
  votes: { investorId: string; vote: string }[];
  yesVotes?: number;
  noVotes?: number;
  completedAt?: string;
};

type InvestorListItem = {
  phoneLast4: string;
  investmentAmount: number;
  sharePercent: number;
  balance: number;
  joinedDate: string;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
};

type ProjectConfig = {
  key: string;
  name: string;
  description: string;
  url: string;
  statsUrl: string;
  apiDocsUrl?: string;
  useEnvFallback?: boolean;
  icon: string;
  gradient: string;
  tagline: string;
  problem: string;
  solution: string;
  audience: string;
  model: string;
  order: number;
  active: boolean;
};

type FooterSettings = {
  brandName: string;
  legalEntity: string;
  address: string;
  email: string;
  phone: string;
  workingHours: string;
  termsUrl: string;
  privacyUrl: string;
  telegramUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  facebookUrl: string;
  xUrl: string;
  linkedinUrl: string;
};

const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  brandName: "FathGroup",
  legalEntity: "FathGroup Investor Platform",
  address: "Toshkent, O'zbekiston",
  email: "support@fathgroup.uz",
  phone: "+998 93 585 05 07",
  workingHours: "Dushanba - Juma, 09:00 - 18:00",
  termsUrl: "/terms",
  privacyUrl: "/privacy",
  telegramUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  facebookUrl: "",
  xUrl: "",
  linkedinUrl: "",
};

const EMPTY_PROJECT: ProjectConfig = {
  key: "", name: "", description: "", url: "", statsUrl: "",
  apiDocsUrl: "",
  useEnvFallback: true,
  icon: "📦", gradient: "from-blue-500/10 to-indigo-500/10",
  tagline: "", problem: "", solution: "", audience: "", model: "",
  order: 0, active: true,
};

type AdminData = {
  investors: Investor[];
  investorsList: InvestorListItem[];
  withdrawals: Withdrawal[];
  transactions: Transaction[];
  expenses: Expense[];
  notifications: Notification[];
  deductions: { taxPercent: number; commissionPercent: number; serverCostPercent: number; otherPercent: number };
  ownerSettings?: Record<string, unknown>;
  platformConfig?: { campaignTargetUzs: number; projects: ProjectConfig[] };
  summary: Summary;
};

type Tab = "overview" | "investors" | "expenses" | "profit" | "withdrawals" | "transactions" | "settings";

/* ═══════════ HELPERS ═══════════ */
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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: "Kutilmoqda", cls: "badge badge-gold" },
  approved: { label: "To'lov kutilmoqda", cls: "badge badge-section" },
  payment_uploaded: { label: "Chek yuborilgan", cls: "badge badge-gold" },
  active: { label: "Faol", cls: "badge badge-live" },
  rejected: { label: "Rad etilgan", cls: "badge badge-offline" },
  completed: { label: "Bajarildi", cls: "badge badge-live" },
};

/* ═══════════ MAIN ═══════════ */
export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [actionLoading, setActionLoading] = useState("");

  /* ── Investor detail modal ── */
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMsg, setEditMsg] = useState("");

  /* ── Approval form state ── */
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [approveBank, setApproveBank] = useState("Kapitalbank");
  const [approveAccount, setApproveAccount] = useState("2020 8000 9051 5374 0002");
  const [approveMfo, setApproveMfo] = useState("01057");
  const [approveInn, setApproveInn] = useState("303089205");
  const [approveRecipient, setApproveRecipient] = useState("YaTT Ro'ziboyev Iqboljon Talibovich");
  const [approvePhone, setApprovePhone] = useState("+998 93 585 05 07");
  const [approveTelegram, setApproveTelegram] = useState("@iqbolruziboyev");
  const [approveNote, setApproveNote] = useState("");

  /* ── Reject form state ── */
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  /* ── Expense form state ── */
  const [expTitle, setExpTitle] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expMsg, setExpMsg] = useState("");

  /* ── Profit distribution state ── */
  const [profitRevenue, setProfitRevenue] = useState("");
  const [profitMsg, setProfitMsg] = useState("");

  /* ── Deduction settings state ── */
  const [dedTax, setDedTax] = useState("");
  const [dedComm, setDedComm] = useState("");
  const [dedServer, setDedServer] = useState("");
  const [dedOther, setDedOther] = useState("");
  const [dedMsg, setDedMsg] = useState("");

  /* ── Owner settings state ── */
  const [ownerForm, setOwnerForm] = useState({
    fullName: "", jshshir: "", passport: "", passportDate: "", activity: "",
    address: "", guvohnoma: "", guvohnomaDate: "", phone: "", bank: "", hisob: "", mfo: "", inn: "",
  });
  const [ownerMsg, setOwnerMsg] = useState("");
  const [footerForm, setFooterForm] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [footerMsg, setFooterMsg] = useState("");
  const [ownerLoaded, setOwnerLoaded] = useState(false);

  /* ── Platform config state ── */
  const [platformProjects, setPlatformProjects] = useState<ProjectConfig[]>([]);
  const [campaignTargetInput, setCampaignTargetInput] = useState("500000000");
  const [campaignMsg, setCampaignMsg] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectConfig>({ ...EMPTY_PROJECT });
  const [editingProjectKey, setEditingProjectKey] = useState<string | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectMsg, setProjectMsg] = useState("");
  const [platformConfigLoaded, setPlatformConfigLoaded] = useState(false);

  /* ── Fetch data ── */
  const fetchData = useCallback(async (s?: string) => {
    const key = s || secret;
    try {
      const res = await fetch("/api/admin", {
        headers: { "x-admin-secret": key },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      setData(json.data);
      // Load owner settings into form (once)
      if (!ownerLoaded && json.data.ownerSettings) {
        const settings = json.data.ownerSettings as Record<string, unknown>;
        const toStr = (v: unknown) => typeof v === "string" ? v : "";
        setOwnerForm((prev) => ({
          ...prev,
          fullName: toStr(settings.fullName),
          jshshir: toStr(settings.jshshir),
          passport: toStr(settings.passport),
          passportDate: toStr(settings.passportDate),
          activity: toStr(settings.activity),
          address: toStr(settings.address),
          guvohnoma: toStr(settings.guvohnoma),
          guvohnomaDate: toStr(settings.guvohnomaDate),
          phone: toStr(settings.phone),
          bank: toStr(settings.bank),
          hisob: toStr(settings.hisob),
          mfo: toStr(settings.mfo),
          inn: toStr(settings.inn),
        }));
        const rawFooter = settings.footer;
        const footer = rawFooter && typeof rawFooter === "object"
          ? (rawFooter as Partial<FooterSettings>)
          : {};
        setFooterForm({ ...DEFAULT_FOOTER_SETTINGS, ...footer });
        setOwnerLoaded(true);
      }
      // Load platform config (once)
      if (!platformConfigLoaded && json.data.platformConfig) {
        setPlatformProjects(json.data.platformConfig.projects ?? []);
        setCampaignTargetInput(String(json.data.platformConfig.campaignTargetUzs ?? 500_000_000));
        setPlatformConfigLoaded(true);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
      return false;
    }
  }, [secret, ownerLoaded, platformConfigLoaded]);

  /* ── Login ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError("");
    const ok = await fetchData(secret.trim());
    if (ok) setAuthed(true);
    setLoading(false);
  };

  /* ── Auto refresh every 30s ── */
  useEffect(() => {
    if (!authed) return;
    const iv = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(iv);
  }, [authed, fetchData]);

  /* ── Admin action ── */
  const doAction = async (body: Record<string, unknown>) => {
    setActionLoading(JSON.stringify(body));
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Xatolik");
      await fetchData();
      return json.message || "Bajarildi";
    } catch (err) {
      return err instanceof Error ? err.message : "Xatolik";
    } finally {
      setActionLoading("");
    }
  };

  /* ── Approve investor handler ── */
  const handleApprove = async () => {
    if (!selectedInvestor) return;
    const msg = await doAction({
      action: "approveInvestor",
      investorId: selectedInvestor.id,
      requisites: { bank: approveBank, account: approveAccount, mfo: approveMfo, inn: approveInn, recipient: approveRecipient },
      contactInfo: { phone: approvePhone, telegram: approveTelegram },
      adminNote: approveNote,
    });
    setEditMsg(msg);
    setShowApproveForm(false);
    setSelectedInvestor({ ...selectedInvestor, status: "approved" });
  };

  /* ── Reject investor handler ── */
  const handleReject = async () => {
    if (!selectedInvestor) return;
    const msg = await doAction({
      action: "rejectInvestor",
      investorId: selectedInvestor.id,
      rejectionReason: rejectReason || "Sabab ko'rsatilmagan",
    });
    setEditMsg(msg);
    setShowRejectForm(false);
    setSelectedInvestor({ ...selectedInvestor, status: "rejected" });
  };

  /* ── Confirm payment handler ── */
  const handleConfirmPayment = async () => {
    if (!selectedInvestor) return;
    const msg = await doAction({ action: "confirmPayment", investorId: selectedInvestor.id });
    setEditMsg(msg);
    setSelectedInvestor({ ...selectedInvestor, status: "active" });
  };

  /* ═══════════ LOGIN ═══════════ */
  if (!authed) {
    return (
      <div className="shell pt-4 pb-10">
        <header className="top-nav mt-2">
          <BrandLogo />
          <Link href="/" className="nav-link">Bosh sahifa</Link>
        </header>

        <section className="mt-16 max-w-sm mx-auto">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-text-secondary mt-2">Faqat admin uchun</p>
          </div>

          <div className="card">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="stat-label">Admin kaliti</label>
                <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="••••••••••"
                  className="calc-input text-sm !font-normal" autoComplete="off" />
              </div>
              {error && <div className="text-sm text-danger bg-red-50/60 p-3 rounded-xl border border-red-100">{error}</div>}
              <button type="submit" disabled={loading || !secret.trim()} className="btn-primary w-full py-3.5 disabled:opacity-40">
                {loading ? "Tekshirilmoqda..." : "Kirish"}
              </button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  if (!data) return null;
  const { summary, investors, investorsList, withdrawals, transactions, expenses, notifications: adminNotifications, deductions } = data;
  const campaignTarget = data.platformConfig?.campaignTargetUzs ?? 500_000_000;
  const campaignProgress = summary.totalInvested > 0 ? Math.min(Math.round((summary.totalInvested / campaignTarget) * 100), 100) : 0;
  const pendingCount = summary.statusCounts.pending;
  const paymentUploadedCount = summary.statusCounts.payment_uploaded;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Umumiy" },
    { key: "investors", label: "Investorlar", count: summary.totalInvestors },
    { key: "expenses", label: "Sarflar", count: summary.votingExpenses || undefined },
    { key: "profit", label: "Foyda taqsim" },
    { key: "withdrawals", label: "Yechishlar", count: summary.pendingWithdrawals || undefined },
    { key: "transactions", label: "Tranzaksiyalar", count: summary.totalTransactions || undefined },
    { key: "settings", label: "Sozlamalar" },
  ];

  /* ═══════════ DASHBOARD ═══════════ */
  return (
    <div className="shell pt-4 pb-10">
      {/* Nav */}
      <header className="top-nav mt-2">
        <BrandLogo label="Admin Panel" />
        <nav className="flex items-center gap-1">
          <Link href="/" className="nav-link">Sayt</Link>
          <Link href="/dashboard" className="nav-link">Kabinet</Link>
          <button onClick={() => { setAuthed(false); setSecret(""); setData(null); }} className="nav-link text-text-muted hover:text-danger">
            Chiqish
          </button>
        </nav>
      </header>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`calc-preset ${tab === t.key ? "active" : ""}`}>
            {t.label}{t.count ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {/* ═══════ OVERVIEW ═══════ */}
      {tab === "overview" && (
        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight">Boshqaruv paneli</h1>
          <p className="text-text-secondary mt-1 text-sm">Investor platformasi holati</p>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="stat-box">
              <div className="stat-label">Jami investorlar</div>
              <div className="stat-value">{summary.totalInvestors}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Faol investitsiya</div>
              <div className="stat-value text-accent">{fmtShort(summary.totalInvested)}</div>
              <div className="text-xs text-text-muted mt-1">so&apos;m</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Yangi arizalar</div>
              <div className="stat-value">{pendingCount}</div>
              <div className="text-xs text-text-muted mt-1">kutilmoqda</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Chek yuborilgan</div>
              <div className="stat-value text-gold">{paymentUploadedCount}</div>
              <div className="text-xs text-text-muted mt-1">tekshirish kerak</div>
            </div>
          </div>

          {/* Kampaniya holati */}
          <div className="card-elevated mt-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Kampaniya holati</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.max(campaignProgress, 1)}%` }} />
            </div>
            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-text-secondary">{fmtShort(summary.totalInvested)} / {fmtShort(campaignTarget)} so&apos;m</span>
              <span className="font-bold text-accent">{campaignProgress}%</span>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="card-elevated mt-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Investor holatlari</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["pending", "approved", "payment_uploaded", "active", "rejected"] as const).map((s) => (
                <div key={s} className="flex flex-col items-center p-3 rounded-lg bg-bg border border-border text-center">
                  <span className={STATUS_MAP[s].cls}>{STATUS_MAP[s].label}</span>
                  <span className="font-mono font-bold mt-1">{summary.statusCounts[s]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chek tekshirish kerak */}
          {investors.filter((i) => i.status === "payment_uploaded").length > 0 && (
            <div className="card mt-6 p-0 overflow-hidden border-gold/30">
              <div className="p-5 pb-0">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold text-gold uppercase tracking-wider">Chek tekshirish kerak</div>
                  <button onClick={() => setTab("investors")} className="text-xs text-accent hover:underline">Ko&apos;rish →</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Investor</th><th>Miqdor</th><th>Chek yuborilgan</th><th></th></tr></thead>
                  <tbody>
                    {investors.filter((i) => i.status === "payment_uploaded").map((inv) => (
                      <tr key={inv.id} className="cursor-pointer" onClick={() => { setTab("investors"); setSelectedInvestor(inv); setEditMsg(""); }}>
                        <td className="font-bold">{inv.fullName}</td>
                        <td className="font-mono">{fmtShort(inv.investmentAmountUzs)} so&apos;m</td>
                        <td className="text-text-muted">{inv.paymentUploadedAt ? formatDateTime(inv.paymentUploadedAt) : "—"}</td>
                        <td><button className="text-xs text-green hover:underline">Tasdiqlash</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Yangi arizalar */}
          {investors.filter((i) => i.status === "pending").length > 0 && (
            <div className="card mt-6 p-0 overflow-hidden">
              <div className="p-5 pb-0">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Yangi arizalar</div>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Ism</th><th>Investitsiya</th><th>Sana</th><th></th></tr></thead>
                  <tbody>
                    {investors.filter((i) => i.status === "pending").map((inv) => (
                      <tr key={inv.id} className="cursor-pointer hover:bg-accent/5" onClick={() => { setTab("investors"); setSelectedInvestor(inv); setEditMsg(""); }}>
                        <td className="font-bold">{inv.fullName}</td>
                        <td className="font-mono">{fmtShort(inv.investmentAmountUzs)} so&apos;m</td>
                        <td className="text-text-muted">{formatDate(inv.createdAt)}</td>
                        <td><button className="text-xs text-accent hover:underline">Ko&apos;rish</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* So'nggi yechish so'rovlari */}
          {withdrawals.filter((w) => w.status === "pending").length > 0 && (
            <div className="card mt-6 p-0 overflow-hidden">
              <div className="p-5 pb-0">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Kutilayotgan yechishlar</div>
                  <button onClick={() => setTab("withdrawals")} className="text-xs text-accent hover:underline">Barchasini ko&apos;rish →</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Investor</th>
                      <th>Miqdor</th>
                      <th>Karta</th>
                      <th>Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.filter((w) => w.status === "pending").slice(0, 5).map((w) => (
                      <tr key={w.id}>
                        <td className="font-bold">{w.investorName}</td>
                        <td className="font-mono font-bold text-accent">{fmtMoney(w.amount)} so&apos;m</td>
                        <td className="font-mono text-text-muted">{w.bankName || ""} ···{w.cardNumber?.slice(-4)}</td>
                        <td className="text-text-muted">{formatDate(w.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ INVESTORS ═══════ */}
      {tab === "investors" && (
        <div className="mt-6">
          <span className="badge badge-section">Investorlar</span>
          <h2 className="text-2xl font-bold tracking-tight">Barcha investorlar</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">{investors.length} ta investor ro&apos;yxatdan o&apos;tgan</p>

          {/* Investor detail modal */}
          {selectedInvestor && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => { setSelectedInvestor(null); setEditMsg(""); setShowApproveForm(false); setShowRejectForm(false); }}>
              <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{selectedInvestor.fullName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-muted font-mono">{selectedInvestor.id}</span>
                      <span className={STATUS_MAP[selectedInvestor.status]?.cls || "badge"}>{STATUS_MAP[selectedInvestor.status]?.label || selectedInvestor.status}</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedInvestor(null); setEditMsg(""); setShowApproveForm(false); setShowRejectForm(false); }} className="text-text-muted hover:text-text-primary text-lg">✕</button>
                </div>

                {/* Ma'lumotlar */}
                <div className="space-y-2 mb-6">
                  {[
                    { label: "Telefon", value: selectedInvestor.phone },
                    { label: "Email", value: selectedInvestor.email || "—" },
                    { label: "Passport", value: `${selectedInvestor.passportSeries} ${selectedInvestor.passportNumber}` },
                    { label: "Manzil", value: selectedInvestor.address || "—" },
                    { label: "Investitsiya", value: `${fmtMoney(selectedInvestor.investmentAmountUzs)} so'm` },
                    { label: "Shartnoma", value: selectedInvestor.contractId },
                    { label: "Ariza sanasi", value: formatDateTime(selectedInvestor.createdAt) },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-center p-3 rounded-lg bg-elevated border border-border-light text-sm">
                      <span className="text-text-muted">{r.label}</span>
                      <span className="font-bold text-right max-w-[60%] break-words">{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* Video tasdiqlash */}
                {selectedInvestor.videoFile && (
                  <div className="mb-6 p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="stat-label mb-2">Video tasdiqlash</div>
                    <video
                      controls
                      className="w-full rounded-lg max-h-64"
                      src={`/api/admin/video/${selectedInvestor.videoFile}?key=${encodeURIComponent(secret)}`}
                    />
                    <p className="text-xs text-text-muted mt-2">
                      Yuklangan: {selectedInvestor.videoUploadedAt ? formatDateTime(selectedInvestor.videoUploadedAt) : "—"}
                    </p>
                  </div>
                )}

                {/* ── PENDING: Tasdiqlash / Rad etish ── */}
                {selectedInvestor.status === "pending" && !showApproveForm && !showRejectForm && (
                  <div className="flex gap-3 mb-4">
                    <button onClick={() => setShowApproveForm(true)} disabled={!!actionLoading}
                      className="btn-primary flex-1 py-3 disabled:opacity-40">Tasdiqlash</button>
                    <button onClick={() => setShowRejectForm(true)} disabled={!!actionLoading}
                      className="btn-secondary flex-1 py-3 text-danger hover:!text-danger disabled:opacity-40">Rad etish</button>
                  </div>
                )}

                {/* ── APPROVE FORM ── */}
                {showApproveForm && selectedInvestor.status === "pending" && (
                  <div className="mb-4 p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="stat-label mb-3">To&apos;lov rekvizitlari (investorga yuboriladi)</div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-text-muted">Oluvchi</label>
                        <input type="text" value={approveRecipient} onChange={(e) => setApproveRecipient(e.target.value)}
                          className="calc-input text-sm !font-normal" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-text-muted">Bank</label>
                          <input type="text" value={approveBank} onChange={(e) => setApproveBank(e.target.value)}
                            className="calc-input text-sm !font-normal" />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted">Hisob raqam</label>
                          <input type="text" value={approveAccount} onChange={(e) => setApproveAccount(e.target.value)}
                            className="calc-input text-sm !font-normal" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-text-muted">MFO</label>
                          <input type="text" value={approveMfo} onChange={(e) => setApproveMfo(e.target.value)}
                            className="calc-input text-sm !font-normal" />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted">INN</label>
                          <input type="text" value={approveInn} onChange={(e) => setApproveInn(e.target.value)}
                            className="calc-input text-sm !font-normal" />
                        </div>
                      </div>
                      <div className="stat-label mt-2">Aloqa ma&apos;lumotlari</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-text-muted">Telefon</label>
                          <input type="text" value={approvePhone} onChange={(e) => setApprovePhone(e.target.value)}
                            className="calc-input text-sm !font-normal" />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted">Telegram</label>
                          <input type="text" value={approveTelegram} onChange={(e) => setApproveTelegram(e.target.value)}
                            className="calc-input text-sm !font-normal" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-text-muted">Izoh (ixtiyoriy)</label>
                        <input type="text" value={approveNote} onChange={(e) => setApproveNote(e.target.value)}
                          placeholder="Qo'shimcha ko'rsatma..." className="calc-input text-sm !font-normal" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleApprove} disabled={!!actionLoading || !approveBank || !approveAccount}
                        className="btn-primary flex-1 py-3 disabled:opacity-40">
                        {actionLoading ? "Saqlanmoqda..." : "Tasdiqlash va rekvizit yuborish"}
                      </button>
                      <button onClick={() => setShowApproveForm(false)} className="btn-secondary py-3">Bekor</button>
                    </div>
                  </div>
                )}

                {/* ── REJECT FORM ── */}
                {showRejectForm && selectedInvestor.status === "pending" && (
                  <div className="mb-4 p-4 rounded-xl bg-danger/5 border border-danger/20">
                    <div className="stat-label mb-3">Rad etish sababi</div>
                    <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Sabab kiriting..." className="calc-input text-sm !font-normal" />
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleReject} disabled={!!actionLoading}
                        className="btn-primary flex-1 py-3 !bg-danger disabled:opacity-40">
                        {actionLoading ? "Saqlanmoqda..." : "Rad etish"}
                      </button>
                      <button onClick={() => setShowRejectForm(false)} className="btn-secondary py-3">Bekor</button>
                    </div>
                  </div>
                )}

                {/* ── PAYMENT UPLOADED: Chek ko'rish + tasdiqlash ── */}
                {selectedInvestor.status === "payment_uploaded" && (
                  <div className="mb-4">
                    <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 mb-4">
                      <div className="stat-label mb-2">Yuborilgan chek</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 rounded bg-bg border border-border">
                          <span className="text-text-muted">Yuborilgan</span>
                          <span className="font-bold">{selectedInvestor.paymentUploadedAt ? formatDateTime(selectedInvestor.paymentUploadedAt) : "—"}</span>
                        </div>
                        {selectedInvestor.paymentReceiptNote && (
                          <div className="flex justify-between p-2 rounded bg-bg border border-border">
                            <span className="text-text-muted">Izoh</span>
                            <span className="font-bold">{selectedInvestor.paymentReceiptNote}</span>
                          </div>
                        )}
                        {selectedInvestor.paymentReceiptFile && (
                          <div className="p-2 rounded bg-bg border border-border text-center">
                            <img
                              src={`/api/admin/receipt/${selectedInvestor.paymentReceiptFile}?key=${encodeURIComponent(secret)}`}
                              alt="To'lov cheki"
                              className="max-w-full max-h-96 mx-auto rounded-lg"
                            />
                            <p className="text-xs text-text-muted mt-2 font-mono">{selectedInvestor.paymentReceiptFile}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleConfirmPayment} disabled={!!actionLoading}
                        className="btn-primary flex-1 py-3 disabled:opacity-40">
                        {actionLoading ? "Tasdiqlanmoqda..." : "To'lovni tasdiqlash — Faollashtirish"}
                      </button>
                      <button disabled={!!actionLoading}
                        onClick={async () => {
                          const msg = await doAction({ action: "rejectInvestor", investorId: selectedInvestor.id, rejectionReason: "To'lov qabul qilinmadi" });
                          setEditMsg(msg);
                          setSelectedInvestor({ ...selectedInvestor, status: "rejected" });
                        }}
                        className="btn-secondary py-3 text-danger hover:!text-danger disabled:opacity-40">Rad</button>
                    </div>
                  </div>
                )}

                {/* ── APPROVED: To'lov kutilmoqda ── */}
                {selectedInvestor.status === "approved" && (
                  <div className="mb-4 p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <div className="stat-label mb-2">To&apos;lov kutilmoqda</div>
                    <p className="text-sm text-text-secondary">Investor hali to&apos;lov chekini yubormagan. Rekvizitlar yuborilgan: {selectedInvestor.approvedAt ? formatDateTime(selectedInvestor.approvedAt) : "—"}</p>
                  </div>
                )}

                {/* ── ACTIVE info ── */}
                {selectedInvestor.status === "active" && (
                  <div className="mb-4 p-4 rounded-xl bg-green/5 border border-green/20">
                    <div className="stat-label mb-2">Investitsiya faol</div>
                    <p className="text-sm text-text-secondary">Faollashtirilgan: {selectedInvestor.activatedAt ? formatDateTime(selectedInvestor.activatedAt) : "—"}</p>
                  </div>
                )}

                {/* ── REJECTED info ── */}
                {selectedInvestor.status === "rejected" && (
                  <div className="mb-4 p-4 rounded-xl bg-danger/5 border border-danger/20">
                    <div className="stat-label mb-2">Rad etilgan</div>
                    <p className="text-sm text-text-secondary">Sabab: {selectedInvestor.rejectionReason || "—"}</p>
                    <p className="text-xs text-text-muted mt-1">{selectedInvestor.rejectedAt ? formatDateTime(selectedInvestor.rejectedAt) : ""}</p>
                  </div>
                )}

                {editMsg && (
                  <div className="p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20 mb-4">{editMsg}</div>
                )}

                {/* Investitsiya miqdorini o'zgartirish */}
                <div className="mb-4 pt-4 border-t border-border-light">
                  <div className="stat-label mb-2">Investitsiya miqdorini o&apos;zgartirish</div>
                  <div className="flex gap-2">
                    <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                      placeholder={String(selectedInvestor.investmentAmountUzs)}
                      className="calc-input text-sm !font-normal flex-1" />
                    <button disabled={!editAmount || !!actionLoading}
                      onClick={async () => {
                        const msg = await doAction({ action: "editInvestment", investorId: selectedInvestor.id, newAmount: Number(editAmount) });
                        setEditMsg(msg);
                        if (msg.includes("→")) {
                          setSelectedInvestor({ ...selectedInvestor, investmentAmountUzs: Number(editAmount) });
                          setEditAmount("");
                        }
                      }}
                      className="btn-primary py-2.5 disabled:opacity-40">Saqlash</button>
                  </div>
                </div>

                {/* O'chirish */}
                <div className="pt-4 border-t border-border-light">
                  <button disabled={!!actionLoading}
                    onClick={async () => {
                      if (!confirm(`"${selectedInvestor.fullName}" investorni o'chirishni tasdiqlaysizmi?`)) return;
                      await doAction({ action: "deleteInvestor", investorId: selectedInvestor.id });
                      setSelectedInvestor(null);
                    }}
                    className="text-sm text-danger hover:underline disabled:opacity-40">
                    Investorni o&apos;chirish
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Investors table */}
          {investors.length > 0 ? (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ism</th>
                      <th>Telefon</th>
                      <th>Investitsiya</th>
                      <th>Holat</th>
                      <th>Sana</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((inv) => (
                      <tr key={inv.id} className="cursor-pointer hover:bg-accent/5" onClick={() => { setSelectedInvestor(inv); setEditAmount(""); setEditMsg(""); setShowApproveForm(false); setShowRejectForm(false); }}>
                        <td className="font-bold">{inv.fullName}</td>
                        <td className="font-mono text-sm">{inv.phone}</td>
                        <td className="font-mono font-bold">{fmtShort(inv.investmentAmountUzs)} <span className="text-text-muted font-normal">so&apos;m</span></td>
                        <td><span className={STATUS_MAP[inv.status]?.cls || "badge"}>{STATUS_MAP[inv.status]?.label || inv.status}</span></td>
                        <td className="text-text-muted">{formatDate(inv.createdAt)}</td>
                        <td>
                          <div className="flex gap-1">
                            {inv.status === "pending" && (
                              <span className="text-xs text-accent">Ko&apos;rish →</span>
                            )}
                            {inv.status === "payment_uploaded" && (
                              <span className="text-xs text-gold">Chek →</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card-elevated text-center py-12">
              <p className="text-text-secondary text-sm">Hali investorlar yo&apos;q</p>
            </div>
          )}

          {/* Investitsiya holati */}
          {investors.filter(i => i.status === "active").length > 0 && (
            <div className="card-elevated mt-6">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Faol investitsiyalar</div>
              <div className="space-y-2">
                {investors.filter(i => i.status === "active").sort((a, b) => b.investmentAmountUzs - a.investmentAmountUzs).map((inv) => {
                  const pct = summary.totalInvested > 0 ? (inv.investmentAmountUzs / summary.totalInvested) * 100 : 0;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg bg-bg border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{inv.fullName}</div>
                        <div className="text-xs text-text-muted">{fmtMoney(inv.investmentAmountUzs)} so&apos;m · {pct.toFixed(1)}%</div>
                      </div>
                      <div className="w-24">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${Math.max(pct, 1)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ EXPENSES ═══════ */}
      {tab === "expenses" && (
        <div className="mt-6">
          <span className="badge badge-section">Sarflar boshqaruvi</span>
          <h2 className="text-2xl font-bold tracking-tight">Sarf takliflari</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Admin taklif kiritadi, investorlar ovoz beradi</p>

          {/* Yangi taklif formasi */}
          <div className="card-elevated mb-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Yangi sarf taklifi</div>
            <div className="space-y-3">
              <div>
                <label className="stat-label">Sarlavha</label>
                <input type="text" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} placeholder="Masalan: Server xarajatlari"
                  className="calc-input text-sm !font-normal" />
              </div>
              <div>
                <label className="stat-label">Tavsif</label>
                <textarea value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Batafsil tavsif..."
                  className="calc-input text-sm !font-normal" rows={2} />
              </div>
              <div>
                <label className="stat-label">Miqdor (so&apos;m)</label>
                <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="1000000" min="1000"
                  className="calc-input text-sm !font-normal" />
              </div>
              {expMsg && <div className="text-sm text-green bg-green/5 p-3 rounded-xl border border-green/20">{expMsg}</div>}
              <button disabled={!!actionLoading || !expTitle.trim() || !expAmount}
                onClick={async () => {
                  const msg = await doAction({ action: "createExpense", title: expTitle, description: expDesc, amount: Number(expAmount) });
                  setExpMsg(msg);
                  setExpTitle(""); setExpDesc(""); setExpAmount("");
                }}
                className="btn-primary w-full py-3 disabled:opacity-40">
                {actionLoading ? "Yaratilmoqda..." : "Taklif kiritish"}
              </button>
            </div>
          </div>

          {/* Sarflar ro'yxati */}
          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map((exp) => {
                const yesVotes = (exp.votes || []).filter((v) => v.vote === "yes").length;
                const noVotes = (exp.votes || []).filter((v) => v.vote === "no").length;
                const statusBadge = exp.status === "voting" ? "badge-gold" : exp.status === "approved" ? "badge-live" : exp.status === "completed" ? "badge-section" : "badge-offline";
                const statusLabel = exp.status === "voting" ? "Ovoz berilmoqda" : exp.status === "approved" ? "Tasdiqlandi" : exp.status === "completed" ? "Bajarildi" : "Rad etildi";
                return (
                  <div key={exp.id} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold">{exp.title}</h3>
                        {exp.description && <p className="text-sm text-text-secondary mt-0.5">{exp.description}</p>}
                      </div>
                      <span className={`badge ${statusBadge}`}>{statusLabel}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono font-bold text-accent">{fmtMoney(exp.amount)} so&apos;m</span>
                      <span className="text-text-muted">{formatDate(exp.createdAt)}</span>
                      <span className="text-green">✓ {yesVotes}</span>
                      <span className="text-danger">✕ {noVotes}</span>
                    </div>
                    {exp.status === "approved" && (
                      <button disabled={!!actionLoading}
                        onClick={async () => { await doAction({ action: "completeExpense", expenseId: exp.id }); }}
                        className="btn-primary mt-3 text-sm py-2 disabled:opacity-40">
                        Bajarildi deb belgilash
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-elevated text-center py-12">
              <p className="text-text-secondary text-sm">Hali sarf takliflari yo&apos;q</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ PROFIT DISTRIBUTION ═══════ */}
      {tab === "profit" && (
        <div className="mt-6">
          <span className="badge badge-section">Foyda taqsimoti</span>
          <h2 className="text-2xl font-bold tracking-tight">Oylik foyda taqsimlash</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">Har oyning 25-sanasida foyda investorlar balansiga qo&apos;shiladi</p>

          {/* Anonim investor ro'yxati */}
          <div className="card-elevated mb-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Investorlar va ulushlar</div>
            {investorsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Investor</th>
                      <th>Investitsiya</th>
                      <th>Ulush</th>
                      <th>Balans</th>
                      <th>Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investorsList.map((inv, i) => (
                      <tr key={i}>
                        <td className="font-mono">···{inv.phoneLast4}</td>
                        <td className="font-mono font-bold">{fmtMoney(inv.investmentAmount)} so&apos;m</td>
                        <td className="font-mono text-accent">{inv.sharePercent.toFixed(2)}%</td>
                        <td className="font-mono">{fmtMoney(inv.balance)} so&apos;m</td>
                        <td className="text-text-muted">{formatDate(inv.joinedDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-text-muted text-sm">Faol investorlar yo&apos;q</p>
            )}
          </div>

          {/* Chegirma sozlamalari */}
          <div className="card-elevated mb-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Soliq va chegirmalar foizlari</div>
            <p className="text-sm text-text-secondary mb-4">Daromaddan avval ushlab qolinadigan foizlar. Toza summa = Daromad − Chegirmalar.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="stat-label">Soliq (%)</label>
                <input type="number" value={dedTax || deductions.taxPercent} onChange={(e) => setDedTax(e.target.value)} min="0" max="100" step="0.1"
                  className="calc-input text-sm !font-normal" />
              </div>
              <div>
                <label className="stat-label">To&apos;lov tizimi komissiyasi (%)</label>
                <input type="number" value={dedComm || deductions.commissionPercent} onChange={(e) => setDedComm(e.target.value)} min="0" max="100" step="0.1"
                  className="calc-input text-sm !font-normal" />
              </div>
              <div>
                <label className="stat-label">Server xarajatlari (%)</label>
                <input type="number" value={dedServer || deductions.serverCostPercent} onChange={(e) => setDedServer(e.target.value)} min="0" max="100" step="0.1"
                  className="calc-input text-sm !font-normal" />
              </div>
              <div>
                <label className="stat-label">Boshqa xarajatlar (%)</label>
                <input type="number" value={dedOther || deductions.otherPercent} onChange={(e) => setDedOther(e.target.value)} min="0" max="100" step="0.1"
                  className="calc-input text-sm !font-normal" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-bg border border-border text-sm">
              <span className="text-text-muted">Jami chegirma:</span>
              <span className="font-mono font-bold text-danger">
                {((Number(dedTax) || deductions.taxPercent) + (Number(dedComm) || deductions.commissionPercent) + (Number(dedServer) || deductions.serverCostPercent) + (Number(dedOther) || deductions.otherPercent)).toFixed(1)}%
              </span>
            </div>
            {dedMsg && <div className="text-sm text-green bg-green/5 p-3 rounded-xl border border-green/20 mt-3">{dedMsg}</div>}
            <button disabled={!!actionLoading}
              onClick={async () => {
                const msg = await doAction({
                  action: "updateDeductions",
                  taxPercent: Number(dedTax) || deductions.taxPercent,
                  commissionPercent: Number(dedComm) || deductions.commissionPercent,
                  serverCostPercent: Number(dedServer) || deductions.serverCostPercent,
                  otherPercent: Number(dedOther) || deductions.otherPercent,
                });
                setDedMsg(msg);
                setDedTax(""); setDedComm(""); setDedServer(""); setDedOther("");
              }}
              className="btn-secondary w-full py-2.5 mt-3 disabled:opacity-40">
              {actionLoading ? "Saqlanmoqda..." : "Chegirmalarni saqlash"}
            </button>
          </div>

          {/* Foyda taqsimlash formasi */}
          <div className="card-elevated">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Foyda taqsimlash</div>
            <p className="text-sm text-text-secondary mb-4">
              Oylik jami daromadni kiriting. Tizim avval chegirmalarni ayiradi, keyin toza summadan 80% ni investorlarga taqsimlaydi.
            </p>
            <div className="space-y-3">
              <div>
                <label className="stat-label">Oylik jami daromad (so&apos;m)</label>
                <input type="number" value={profitRevenue} onChange={(e) => setProfitRevenue(e.target.value)} placeholder="10000000" min="0"
                  className="calc-input text-sm !font-normal" />
              </div>
              {Number(profitRevenue) > 0 && (() => {
                const rev = Number(profitRevenue);
                const totalDedPct = deductions.taxPercent + deductions.commissionPercent + deductions.serverCostPercent + deductions.otherPercent;
                const taxAmt = Math.round(rev * deductions.taxPercent / 100);
                const commAmt = Math.round(rev * deductions.commissionPercent / 100);
                const serverAmt = Math.round(rev * deductions.serverCostPercent / 100);
                const otherAmt = Math.round(rev * deductions.otherPercent / 100);
                const net = Math.round(rev * (1 - totalDedPct / 100));
                const inv80 = Math.round(net * 0.8);
                const cr20 = Math.round(net * 0.2);
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                      <span className="text-text-muted">Umumiy tushum</span>
                      <span className="font-mono font-bold">{fmtMoney(rev)} so&apos;m</span>
                    </div>
                    <div className="text-xs font-bold text-text-muted uppercase tracking-wider mt-2 mb-1">Chegirmalar</div>
                    {deductions.taxPercent > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5 border border-danger/10 text-sm">
                        <span className="text-danger">− Soliq ({deductions.taxPercent}%)</span>
                        <span className="font-mono text-danger">−{fmtMoney(taxAmt)} so&apos;m</span>
                      </div>
                    )}
                    {deductions.commissionPercent > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5 border border-danger/10 text-sm">
                        <span className="text-danger">− Komissiya ({deductions.commissionPercent}%)</span>
                        <span className="font-mono text-danger">−{fmtMoney(commAmt)} so&apos;m</span>
                      </div>
                    )}
                    {deductions.serverCostPercent > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5 border border-danger/10 text-sm">
                        <span className="text-danger">− Server ({deductions.serverCostPercent}%)</span>
                        <span className="font-mono text-danger">−{fmtMoney(serverAmt)} so&apos;m</span>
                      </div>
                    )}
                    {deductions.otherPercent > 0 && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-danger/5 border border-danger/10 text-sm">
                        <span className="text-danger">− Boshqa ({deductions.otherPercent}%)</span>
                        <span className="font-mono text-danger">−{fmtMoney(otherAmt)} so&apos;m</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-3 rounded-lg bg-green/5 border border-green/20 text-sm font-bold">
                      <span className="text-green">= Toza summa</span>
                      <span className="font-mono text-green">{fmtMoney(net)} so&apos;m</span>
                    </div>
                    <div className="text-xs font-bold text-text-muted uppercase tracking-wider mt-2 mb-1">Taqsimot</div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                      <span className="text-text-muted">Investorlar fondi (80%)</span>
                      <span className="font-mono font-bold text-accent">{fmtMoney(inv80)} so&apos;m</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border text-sm">
                      <span className="text-text-muted">Yaratuvchi fondi (20%)</span>
                      <span className="font-mono font-bold">{fmtMoney(cr20)} so&apos;m</span>
                    </div>
                  </div>
                );
              })()}
              {profitMsg && <div className="text-sm text-green bg-green/5 p-3 rounded-xl border border-green/20">{profitMsg}</div>}
              <button disabled={!!actionLoading || !profitRevenue || Number(profitRevenue) <= 0}
                onClick={async () => {
                  const msg = await doAction({ action: "distributeProfit", monthlyRevenue: Number(profitRevenue) });
                  setProfitMsg(msg);
                  setProfitRevenue("");
                }}
                className="btn-primary w-full py-3 disabled:opacity-40">
                {actionLoading ? "Taqsimlanmoqda..." : "Foydani taqsimlash"}
              </button>
            </div>
          </div>

          {/* Oxirgi bildirishnomalar */}
          {adminNotifications.length > 0 && (
            <div className="card mt-6">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Oxirgi bildirishnomalar</div>
              <div className="space-y-2">
                {adminNotifications.slice(0, 10).map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg border border-border">
                    <div className={`badge text-xs ${n.type === "profit_distributed" ? "badge-live" : n.type === "new_investor" ? "badge-gold" : "badge-section"}`}>
                      {n.type === "profit_distributed" ? "Foyda" : n.type === "new_investor" ? "Yangi" : n.type === "expense_approved" ? "Sarf" : "Tizim"}
                    </div>
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
        </div>
      )}

      {/* ═══════ WITHDRAWALS ═══════ */}
      {tab === "withdrawals" && (
        <div className="mt-6">
          <span className="badge badge-section">Yechish so&apos;rovlari</span>
          <h2 className="text-2xl font-bold tracking-tight">Pul yechish so&apos;rovlari</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">{withdrawals.length} ta so&apos;rov · {summary.pendingWithdrawals} ta kutilmoqda</p>

          {/* Yechish statistikasi */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-box text-center">
              <div className="stat-label">Kutilmoqda</div>
              <div className="stat-value text-base text-gold">{summary.pendingWithdrawals}</div>
            </div>
            <div className="stat-box text-center">
              <div className="stat-label">Jami yechilgan</div>
              <div className="stat-value text-base">{fmtShort(summary.totalWithdrawn)}</div>
            </div>
            <div className="stat-box text-center">
              <div className="stat-label">Jami so&apos;rovlar</div>
              <div className="stat-value text-base">{withdrawals.length}</div>
            </div>
          </div>

          {withdrawals.length > 0 ? (
            <div className="card mt-6 p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Investor</th>
                      <th>Miqdor</th>
                      <th>Karta</th>
                      <th>Sana</th>
                      <th>Holat</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td>
                          <div className="font-bold">{w.investorName}</div>
                          <div className="text-xs text-text-muted font-mono">{w.phone}</div>
                        </td>
                        <td className="font-mono font-bold text-accent">{fmtMoney(w.amount)} so&apos;m</td>
                        <td>
                          <div className="font-mono text-sm">{w.bankName}</div>
                          <div className="font-mono text-xs text-text-muted">{w.cardNumber}</div>
                        </td>
                        <td className="text-text-muted">{formatDate(w.createdAt)}</td>
                        <td><span className={STATUS_MAP[w.status]?.cls || "badge"}>{STATUS_MAP[w.status]?.label || w.status}</span></td>
                        <td>
                          {w.status === "pending" && (
                            <div className="flex gap-2">
                              <button disabled={!!actionLoading}
                                onClick={async () => { await doAction({ action: "processWithdrawal", withdrawalId: w.id, newStatus: "completed" }); }}
                                className="text-xs text-green hover:underline disabled:opacity-40">
                                Tasdiqlash
                              </button>
                              <button disabled={!!actionLoading}
                                onClick={async () => { await doAction({ action: "processWithdrawal", withdrawalId: w.id, newStatus: "rejected" }); }}
                                className="text-xs text-danger hover:underline disabled:opacity-40">
                                Rad
                              </button>
                            </div>
                          )}
                          {w.processedAt && <div className="text-xs text-text-muted">{formatDate(w.processedAt)}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card-elevated text-center py-12 mt-6">
              <p className="text-text-secondary text-sm">Hali yechish so&apos;rovlari yo&apos;q</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TRANSACTIONS ═══════ */}
      {tab === "transactions" && (
        <div className="mt-6">
          <span className="badge badge-section">Tranzaksiyalar</span>
          <h2 className="text-2xl font-bold tracking-tight">Barcha tranzaksiyalar</h2>
          <p className="text-text-secondary mt-1 mb-6 text-sm">{transactions.length} ta operatsiya</p>

          {transactions.length > 0 ? (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Investor</th>
                      <th>Tur</th>
                      <th>Tavsif</th>
                      <th>Sana</th>
                      <th className="text-right">Miqdor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="font-mono text-xs text-text-muted">{tx.id.slice(0, 12)}</td>
                        <td className="font-mono text-xs">{tx.investorId.slice(0, 12)}</td>
                        <td>
                          <span className={`badge ${tx.type === "deposit" ? "badge-live" : tx.type === "withdrawal" ? "badge-offline" : "badge-gold"}`}>
                            {tx.type === "deposit" ? "Kirish" : tx.type === "withdrawal" ? "Chiqish" : tx.type}
                          </span>
                        </td>
                        <td className="text-text-secondary">{tx.description}</td>
                        <td className="text-text-muted">{formatDateTime(tx.createdAt)}</td>
                        <td className={`text-right font-mono font-bold ${tx.type === "deposit" ? "text-green" : "text-danger"}`}>
                          {tx.type === "withdrawal" ? "-" : "+"}{fmtMoney(tx.amount)} so&apos;m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card-elevated text-center py-12">
              <p className="text-text-secondary text-sm">Hali tranzaksiyalar yo&apos;q</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ SETTINGS ═══════ */}
      {tab === "settings" && (
        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight">Sozlamalar</h1>

          {/* Owner / Loyiha rahbari rekvizitlari */}
          <div className="card mt-6">
            <h2 className="text-lg font-bold mb-4">Loyiha rahbari rekvizitlari</h2>
            <p className="text-sm text-text-muted mb-4">Bu ma&apos;lumotlar shartnomada avtomatik ko&apos;rsatiladi</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">To&apos;liq ism (YaTT)</label>
                  <input type="text" value={ownerForm.fullName} onChange={(e) => setOwnerForm({ ...ownerForm, fullName: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="Ro'ziboyev Iqboljon Talibovich" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">JSHSHIR</label>
                  <input type="text" value={ownerForm.jshshir} onChange={(e) => setOwnerForm({ ...ownerForm, jshshir: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="30308920580088" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Passport</label>
                  <input type="text" value={ownerForm.passport} onChange={(e) => setOwnerForm({ ...ownerForm, passport: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="AB 746 56 99" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Passport sanasi</label>
                  <input type="text" value={ownerForm.passportDate} onChange={(e) => setOwnerForm({ ...ownerForm, passportDate: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="12.08.2017" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted">Faoliyat turi</label>
                <input type="text" value={ownerForm.activity} onChange={(e) => setOwnerForm({ ...ownerForm, activity: e.target.value })}
                  className="calc-input text-sm !font-normal" />
              </div>
              <div>
                <label className="text-xs text-text-muted">Manzil</label>
                <input type="text" value={ownerForm.address} onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })}
                  className="calc-input text-sm !font-normal" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Guvohnoma №</label>
                  <input type="text" value={ownerForm.guvohnoma} onChange={(e) => setOwnerForm({ ...ownerForm, guvohnoma: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="5640805" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Guvohnoma sanasi</label>
                  <input type="text" value={ownerForm.guvohnomaDate} onChange={(e) => setOwnerForm({ ...ownerForm, guvohnomaDate: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="15.09.2023" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted">Telefon</label>
                <input type="text" value={ownerForm.phone} onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                  className="calc-input text-sm !font-normal" placeholder="+998 93 585 05 07" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Bank</label>
                  <input type="text" value={ownerForm.bank} onChange={(e) => setOwnerForm({ ...ownerForm, bank: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="Kapitalbank" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Hisob raqam</label>
                  <input type="text" value={ownerForm.hisob} onChange={(e) => setOwnerForm({ ...ownerForm, hisob: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="2020 8000 9051 5374 0002" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">MFO</label>
                  <input type="text" value={ownerForm.mfo} onChange={(e) => setOwnerForm({ ...ownerForm, mfo: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="01057" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">INN</label>
                  <input type="text" value={ownerForm.inn} onChange={(e) => setOwnerForm({ ...ownerForm, inn: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="303089205" />
                </div>
              </div>
            </div>
            {ownerMsg && (
              <div className="mt-3 p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20">{ownerMsg}</div>
            )}
            <button
              disabled={!!actionLoading}
              onClick={async () => {
                setOwnerMsg("");
                setFooterMsg("");
                const msg = await doAction({ action: "saveOwnerSettings", settings: { ...ownerForm, footer: footerForm } });
                setOwnerMsg(msg);
                setFooterMsg(msg);
              }}
              className="btn-primary py-3 mt-4 w-full disabled:opacity-40"
            >
              {actionLoading ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>

          <div className="card mt-6">
            <h2 className="text-lg font-bold mb-4">Footer va huquqiy ma&apos;lumotlar</h2>
            <p className="text-sm text-text-muted mb-4">Bosh sahifadagi footer, Terms/Privacy va ijtimoiy tarmoq havolalari shu yerda boshqariladi</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Brend nomi</label>
                  <input type="text" value={footerForm.brandName} onChange={(e) => setFooterForm({ ...footerForm, brandName: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="FathGroup" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Yuridik nom</label>
                  <input type="text" value={footerForm.legalEntity} onChange={(e) => setFooterForm({ ...footerForm, legalEntity: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="FathGroup Investor Platform" />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted">Manzil</label>
                <input type="text" value={footerForm.address} onChange={(e) => setFooterForm({ ...footerForm, address: e.target.value })}
                  className="calc-input text-sm !font-normal" placeholder="Toshkent, O'zbekiston" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Email</label>
                  <input type="text" value={footerForm.email} onChange={(e) => setFooterForm({ ...footerForm, email: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="support@fathgroup.uz" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Telefon</label>
                  <input type="text" value={footerForm.phone} onChange={(e) => setFooterForm({ ...footerForm, phone: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="+998 93 585 05 07" />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted">Ish vaqti</label>
                <input type="text" value={footerForm.workingHours} onChange={(e) => setFooterForm({ ...footerForm, workingHours: e.target.value })}
                  className="calc-input text-sm !font-normal" placeholder="Dushanba - Juma, 09:00 - 18:00" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Terms havolasi</label>
                  <input type="text" value={footerForm.termsUrl} onChange={(e) => setFooterForm({ ...footerForm, termsUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="/terms yoki https://..." />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Privacy havolasi</label>
                  <input type="text" value={footerForm.privacyUrl} onChange={(e) => setFooterForm({ ...footerForm, privacyUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="/privacy yoki https://..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">Telegram URL</label>
                  <input type="text" value={footerForm.telegramUrl} onChange={(e) => setFooterForm({ ...footerForm, telegramUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="https://t.me/..." />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Instagram URL</label>
                  <input type="text" value={footerForm.instagramUrl} onChange={(e) => setFooterForm({ ...footerForm, instagramUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="https://instagram.com/..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">YouTube URL</label>
                  <input type="text" value={footerForm.youtubeUrl} onChange={(e) => setFooterForm({ ...footerForm, youtubeUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="https://youtube.com/..." />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Facebook URL</label>
                  <input type="text" value={footerForm.facebookUrl} onChange={(e) => setFooterForm({ ...footerForm, facebookUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="https://facebook.com/..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted">X (Twitter) URL</label>
                  <input type="text" value={footerForm.xUrl} onChange={(e) => setFooterForm({ ...footerForm, xUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="https://x.com/..." />
                </div>
                <div>
                  <label className="text-xs text-text-muted">LinkedIn URL</label>
                  <input type="text" value={footerForm.linkedinUrl} onChange={(e) => setFooterForm({ ...footerForm, linkedinUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="https://linkedin.com/company/..." />
                </div>
              </div>
            </div>

            {footerMsg && (
              <div className="mt-3 p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20">{footerMsg}</div>
            )}
            <button
              disabled={!!actionLoading}
              onClick={async () => {
                setFooterMsg("");
                const msg = await doAction({ action: "saveOwnerSettings", settings: { ...ownerForm, footer: footerForm } });
                setFooterMsg(msg);
              }}
              className="btn-primary py-3 mt-4 w-full disabled:opacity-40"
            >
              {actionLoading ? "Saqlanmoqda..." : "Footer sozlamalarini saqlash"}
            </button>
          </div>

          {/* ─── Kampaniya limiti ─── */}
          <div className="card mt-6">
            <h2 className="text-lg font-bold mb-2">Kampaniya limiti</h2>
            <div className="p-3 rounded-xl bg-gold/5 border border-gold/30 text-sm text-gold mb-4">
              ⚠️ Diqqat: Limitni o&apos;zgartirish faqat yangi arizalarga ta&apos;sir qiladi. Mavjud shartnomalar o&apos;zgarmaydi.
            </div>
            <label className="text-xs text-text-muted">Maqsadli kapital (so&apos;m)</label>
            <input
              type="number"
              min={1_000_000}
              value={campaignTargetInput}
              onChange={(e) => setCampaignTargetInput(e.target.value)}
              className="calc-input text-sm !font-normal mt-1"
              placeholder="500000000"
            />
            <p className="text-xs text-text-muted mt-1">
              Hozirgi qiymat: <strong>{fmtMoney(campaignTarget)}</strong> so&apos;m
            </p>
            {campaignMsg && (
              <div className="mt-3 p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20">{campaignMsg}</div>
            )}
            <button
              disabled={!!actionLoading}
              onClick={async () => {
                const newTarget = Number(campaignTargetInput);
                if (!newTarget || newTarget < 1_000_000) {
                  setCampaignMsg("Minimal limit 1,000,000 so'm");
                  return;
                }
                setCampaignMsg("");
                const msg = await doAction({
                  action: "savePlatformConfig",
                  campaignTargetUzs: newTarget,
                  projects: platformProjects,
                });
                setCampaignMsg(msg);
                setPlatformConfigLoaded(false);
                await fetchData();
              }}
              className="btn-primary py-3 mt-4 w-full disabled:opacity-40"
            >
              {actionLoading ? "Saqlanmoqda..." : "Limitni saqlash"}
            </button>
          </div>

          {/* ─── Loyihalar ─── */}
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Loyihalar</h2>
              <button
                className="btn-primary py-2 px-4 text-sm"
                onClick={() => {
                  setProjectForm({ ...EMPTY_PROJECT, order: platformProjects.length });
                  setEditingProjectKey(null);
                  setProjectMsg("");
                  setShowProjectForm(true);
                }}
              >
                + Yangi loyiha
              </button>
            </div>

            {platformProjects.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">Loyihalar mavjud emas</p>
            ) : (
              <div className="space-y-2">
                {platformProjects.map((p, idx) => (
                  <div key={p.key || idx} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface">
                    <span className="text-xl w-8 text-center">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{p.name || "(Nomsiz)"}</div>
                      <div className="text-xs text-text-muted truncate">{p.url}</div>
                      <div className="text-[11px] text-text-muted truncate">
                        statsUrl: {p.statsUrl ? "ulangan" : "yo&apos;q"} · env fallback: {p.useEnvFallback !== false ? "yoqilgan" : "o&apos;chirilgan"} · docs: {p.apiDocsUrl ? "bor" : "yo&apos;q"}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.active !== false ? "bg-green/10 text-green" : "bg-danger/10 text-danger"}`}>
                      {p.active !== false ? "Faol" : "Nofaol"}
                    </span>
                    <button
                      className="text-xs text-accent hover:underline"
                      onClick={() => {
                        setProjectForm({ ...p });
                        setEditingProjectKey(p.key);
                        setProjectMsg("");
                        setShowProjectForm(true);
                      }}
                    >
                      Tahrir
                    </button>
                    <button
                      className="text-xs text-danger hover:underline"
                      onClick={async () => {
                        if (!confirm(`"${p.name}" ni o'chirasizmi?`)) return;
                        const updated = platformProjects.filter((_, i) => i !== idx);
                        const msg = await doAction({
                          action: "savePlatformConfig",
                          campaignTargetUzs: Number(campaignTargetInput) || 500_000_000,
                          projects: updated,
                        });
                        setProjectMsg(msg);
                        setPlatformProjects(updated);
                      }}
                    >
                      O&apos;chirish
                    </button>
                  </div>
                ))}
              </div>
            )}

            {projectMsg && (
              <div className="mt-3 p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20">{projectMsg}</div>
            )}
          </div>

          {/* ─── Yangi loyiha integratsiya dokumentatsiyasi ─── */}
          <div className="card mt-6">
            <h2 className="text-lg font-bold mb-2">Yangi loyiha ulash talablari</h2>
            <p className="text-sm text-text-muted mb-3">
              Loyiha portfelga qo&apos;shilishi uchun kamida bitta real-time statistika endpointi bo&apos;lishi shart.
            </p>
            <div className="mb-4 p-3 rounded-xl bg-accent/5 border border-accent/20 text-sm text-text-secondary">
              To&apos;liq batafsil qo&apos;llanma: <Link href="/project-integration-docs" className="text-accent font-bold hover:underline">/project-integration-docs</Link>
            </div>
            <div className="p-3 rounded-xl bg-bg border border-border space-y-2 text-sm">
              <div><strong>Majburiy maydonlar:</strong> name, url, description, tagline</div>
              <div><strong>Tavsiya:</strong> apiDocsUrl, problem, solution, audience, model, icon, gradient</div>
              <div><strong>statsUrl javobi (JSON):</strong></div>
              <pre className="text-xs overflow-auto bg-surface border border-border-light rounded-lg p-2">{`{
  "success": true,
  "data": {
    "state": "online",
    "monthlyRevenueUsd": 1200,
    "activePayingClients": 85,
    "newClients30d": 22,
    "syncEventsToday": 14,
    "lastSync": "2026-03-24T10:20:30.000Z",
    "source": "project-api",
    "totalUsers": 540,
    "freeUsers": 455,
    "paidUsers": 85
  }
}`}</pre>
              <div className="text-xs text-text-muted">
                Eslatma: test uchun loyihani uzmoqchi bo&apos;lsangiz, statsUrl ni bo&apos;sh qoldiring va env fallback ni o&apos;chiring.
              </div>
            </div>
          </div>

          {/* ─── Loyiha form ─── */}
          {showProjectForm && (
            <div className="card mt-6 border-2 border-accent/30">
              <h2 className="text-lg font-bold mb-4">
                {editingProjectKey ? "Loyihani tahrir qilish" : "Yangi loyiha qo'shish"}
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted">Loyiha nomi *</label>
                    <input type="text" value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      className="calc-input text-sm !font-normal" placeholder="CopyTrade" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Veb sayt URL</label>
                    <input type="text" value={projectForm.url}
                      onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })}
                      className="calc-input text-sm !font-normal" placeholder="copytrade.uz" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Statistika API URL</label>
                  <input type="text" value={projectForm.statsUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, statsUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="https://api.copytrade.uz/stats" />
                  <p className="text-[11px] text-text-muted mt-1">
                    Test uzish uchun bu maydonni bo&apos;sh qoldirish mumkin, lekin pastdagi env fallback ham o&apos;chirilishi kerak.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-text-muted">API dokumentatsiya URL</label>
                  <input type="text" value={projectForm.apiDocsUrl || ""}
                    onChange={(e) => setProjectForm({ ...projectForm, apiDocsUrl: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="https://docs.copytrade.uz/investor-stats" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted">Emoji icon</label>
                    <input type="text" value={projectForm.icon}
                      onChange={(e) => setProjectForm({ ...projectForm, icon: e.target.value })}
                      className="calc-input text-sm !font-normal" placeholder="📊" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Gradient (Tailwind classlar)</label>
                    <input type="text" value={projectForm.gradient}
                      onChange={(e) => setProjectForm({ ...projectForm, gradient: e.target.value })}
                      className="calc-input text-sm !font-normal" placeholder="from-blue-500/10 to-indigo-500/10" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted">Qisqa tavsif</label>
                  <input type="text" value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="Loyiha haqida qisqacha..." />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Tagline (ilova slogani)</label>
                  <input type="text" value={projectForm.tagline}
                    onChange={(e) => setProjectForm({ ...projectForm, tagline: e.target.value })}
                    className="calc-input text-sm !font-normal" placeholder="Trading bilmasdan — daromad qiling" />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Muammo</label>
                  <textarea rows={2} value={projectForm.problem}
                    onChange={(e) => setProjectForm({ ...projectForm, problem: e.target.value })}
                    className="calc-input text-sm !font-normal resize-none" placeholder="Qanday muammoni hal qiladi..." />
                </div>
                <div>
                  <label className="text-xs text-text-muted">Yechim</label>
                  <textarea rows={2} value={projectForm.solution}
                    onChange={(e) => setProjectForm({ ...projectForm, solution: e.target.value })}
                    className="calc-input text-sm !font-normal resize-none" placeholder="Qanday yechim taklif qiladi..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted">Maqsad auditoriya</label>
                    <input type="text" value={projectForm.audience}
                      onChange={(e) => setProjectForm({ ...projectForm, audience: e.target.value })}
                      className="calc-input text-sm !font-normal" placeholder="Talabalar, bizneslar..." />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Biznes model</label>
                    <input type="text" value={projectForm.model}
                      onChange={(e) => setProjectForm({ ...projectForm, model: e.target.value })}
                      className="calc-input text-sm !font-normal" placeholder="Obuna, freemium..." />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-text-muted">Tartib raqami</label>
                  <input type="number" min={0} value={projectForm.order}
                    onChange={(e) => setProjectForm({ ...projectForm, order: Number(e.target.value) })}
                    className="calc-input text-sm !font-normal w-24" />
                  <label className="flex items-center gap-2 text-sm cursor-pointer ml-4">
                    <input type="checkbox" checked={projectForm.useEnvFallback !== false}
                      onChange={(e) => setProjectForm({ ...projectForm, useEnvFallback: e.target.checked })}
                      className="w-4 h-4 accent-accent" />
                    Env fallback yoqilgan
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer ml-4">
                    <input type="checkbox" checked={projectForm.active !== false}
                      onChange={(e) => setProjectForm({ ...projectForm, active: e.target.checked })}
                      className="w-4 h-4 accent-accent" />
                    Faol
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  disabled={!!actionLoading}
                  onClick={async () => {
                    if (!projectForm.name.trim()) { setProjectMsg("Loyiha nomi kiritilishi shart"); return; }
                    if (!editingProjectKey && !projectForm.statsUrl.trim()) { setProjectMsg("Yangi loyiha uchun statsUrl majburiy: loyiha API endpointi kiritilishi kerak"); return; }
                    if (!editingProjectKey && !projectForm.apiDocsUrl?.trim()) { setProjectMsg("Yangi loyiha uchun apiDocsUrl majburiy: integratsiya dokumentatsiyasi linkini kiriting"); return; }
                    if (editingProjectKey && !projectForm.statsUrl.trim() && projectForm.useEnvFallback !== false) { setProjectMsg("statsUrl bo'sh bo'lsa, uzish testi uchun env fallback ni ham o'chiring"); return; }
                    setProjectMsg("");
                    let updatedProjects: ProjectConfig[];
                    if (editingProjectKey) {
                      updatedProjects = platformProjects.map((p) =>
                        p.key === editingProjectKey ? { ...projectForm } : p
                      );
                    } else {
                      updatedProjects = [...platformProjects, { ...projectForm }];
                    }
                    const msg = await doAction({
                      action: "savePlatformConfig",
                      campaignTargetUzs: Number(campaignTargetInput) || 500_000_000,
                      projects: updatedProjects,
                    });
                    setProjectMsg(msg);
                    setPlatformProjects(updatedProjects);
                    setPlatformConfigLoaded(false);
                    await fetchData();
                    setShowProjectForm(false);
                  }}
                  className="btn-primary py-3 flex-1 disabled:opacity-40"
                >
                  {actionLoading ? "Saqlanmoqda..." : "Saqlash"}
                </button>
                <button
                  onClick={() => { setShowProjectForm(false); setProjectMsg(""); }}
                  className="py-3 px-6 rounded-xl border border-border text-sm"
                >
                  Bekor qilish
                </button>
              </div>
              {projectMsg && (
                <div className="mt-3 p-3 rounded-xl text-sm bg-green/5 text-green border border-green/20">{projectMsg}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
