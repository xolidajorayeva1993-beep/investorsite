"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import type { AggregatedStats, FundraisingStatus } from "@/lib/types";
import BrandLogo from "@/components/BrandLogo";

type HubData = {
  success: boolean;
  stats: AggregatedStats;
  fundraising: FundraisingStatus;
  footerSettings?: FooterSettings;
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

/* ═══ BIZNES KONSTANTALAR ═══ */
const CREATOR_PCT = 20;
const INVESTOR_POOL_PCT = 80;
const PRESETS = [5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000];

function fmtUzs(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + " ming";
  return n.toLocaleString();
}
function fmtMoney(n: number): string {
  return n.toLocaleString("uz-UZ");
}

function toExternalUrl(url: string): string {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function toFooterLink(url: string): string {
  if (!url) return "#";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  if (url.startsWith("/")) return url;
  return `https://${url}`;
}

function isExternalLink(url: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(url);
}

function SocialIcon({ kind }: { kind: "telegram" | "instagram" | "youtube" | "facebook" | "x" | "linkedin" }) {
  if (kind === "telegram") {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 4L3 11l6.5 2.5L19 7l-7 7 .5 6L16 16l3 2 2-14z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (kind === "instagram") {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>;
  }
  if (kind === "youtube") {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="4" stroke="currentColor" strokeWidth="1.6" /><path d="M10 9l5 3-5 3V9z" fill="currentColor" /></svg>;
  }
  if (kind === "facebook") {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 8h3V4h-3a5 5 0 00-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9a1 1 0 011-1z" fill="currentColor" /></svg>;
  }
  if (kind === "x") {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4l7 8-7 8h3.5l5.2-6 5.3 6H21l-7.2-8L21 4h-3.5l-5 5.8L7.5 4H4z" fill="currentColor" /></svg>;
  }
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10a5 5 0 015-5h5v4h-5a1 1 0 00-1 1v9H7v-9z" fill="currentColor" /><path d="M5 8h4v12H5z" fill="currentColor" /></svg>;
}

/* ═══ Animated Counter ═══ */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(step);
      else ref.current = value;
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{fmtMoney(display)}</>;
}

/* ═══ PIE CHART (SVG) ═══ */
function PieChart({
  creatorPct,
  investorPct,
  yourPct,
  size = 200,
}: {
  creatorPct: number;
  investorPct: number;
  yourPct: number;
  size?: number;
}) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const ir = r * 0.55;

  function arc(startPct: number, endPct: number) {
    const s = (startPct / 100) * 360 - 90;
    const e = (endPct / 100) * 360 - 90;
    const sRad = (s * Math.PI) / 180;
    const eRad = (e * Math.PI) / 180;
    const large = endPct - startPct > 50 ? 1 : 0;
    return [
      `M ${cx + ir * Math.cos(sRad)} ${cy + ir * Math.sin(sRad)}`,
      `L ${cx + r * Math.cos(sRad)} ${cy + r * Math.sin(sRad)}`,
      `A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(eRad)} ${cy + r * Math.sin(eRad)}`,
      `L ${cx + ir * Math.cos(eRad)} ${cy + ir * Math.sin(eRad)}`,
      `A ${ir} ${ir} 0 ${large} 0 ${cx + ir * Math.cos(sRad)} ${cy + ir * Math.sin(sRad)}`,
      "Z",
    ].join(" ");
  }

  const otherInvestorsPct = Math.max(0, investorPct - yourPct);
  const s1 = 0;
  const e1 = creatorPct;
  const s2 = e1;
  const e2 = e1 + otherInvestorsPct;
  const s3 = e2;
  const e3 = e2 + yourPct;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {creatorPct > 0.3 && <path d={arc(s1, e1)} fill="#BF5AF2" opacity={0.85} />}
      {otherInvestorsPct > 0.3 && <path d={arc(s2, e2)} fill="#5856D6" opacity={0.7} />}
      {yourPct > 0.3 && <path d={arc(s3, e3)} fill="#0071E3" />}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#1D1D1F" fontSize="22" fontWeight="700">
        {yourPct.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#86868B" fontSize="10">
        sizning ulush
      </text>
    </svg>
  );
}

/* ═══ Intersection Observer hook ═══ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}



export default function HomePage() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [investAmount, setInvestAmount] = useState(10_000_000);
  const [activePreset, setActivePreset] = useState(10_000_000);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hub/stats")
      .then((r) => r.json())
      .then((d: HubData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const fund = data?.fundraising;
  const totalRevenueUzs = stats?.totals.monthlyRevenueUzs ?? 0;
  const currentInvested = fund?.currentCapitalUzs ?? 0;
  const investorCount = fund?.investorCount ?? 0;
  const targetCapital = fund?.targetCapitalUzs ?? 500_000_000;

  const newTotalInvested = currentInvested + investAmount;
  const poolSharePct = newTotalInvested > 0 ? (investAmount / newTotalInvested) * INVESTOR_POOL_PCT : 0;
  const otherInvestorsPct = newTotalInvested > 0 ? (currentInvested / newTotalInvested) * INVESTOR_POOL_PCT : 0;
  const monthlyProfit = totalRevenueUzs * (poolSharePct / 100);
  const yearlyProfit = monthlyProfit * 12;

  const avgInvestmentPerInvestor = investorCount > 0 ? currentInvested / investorCount : 0;
  const currentPerInvestorPct = currentInvested > 0 && investorCount > 0
    ? (avgInvestmentPerInvestor / currentInvested) * INVESTOR_POOL_PCT : 0;
  const currentPerInvestorProfit = totalRevenueUzs * (currentPerInvestorPct / 100);

  const heroAnim = useInView(0.1);
  const statsAnim = useInView(0.2);
  const formulaAnim = useInView(0.15);
  const portfolioAnim = useInView(0.1);
  const calcAnim = useInView(0.1);
  const howAnim = useInView(0.15);
  const guaranteeAnim = useInView(0.15);
  const ctaAnim = useInView(0.2);

  const totalUsers = stats?.projects.reduce((sum, p) => sum + (p.stats?.totalUsers ?? 0), 0) ?? 0;
  const totalPaidUsers = stats?.projects.reduce((sum, p) => sum + (p.stats?.paidUsers ?? 0), 0) ?? 0;
  const projectCount = stats?.projects.length ?? 0;
  const footerProjectNames = stats?.projects?.length
    ? stats.projects.map((p) => p.name).join(" · ")
    : "CopyTrade · FATH Robot · EPDF Services · Ticknote";
  const footer = { ...DEFAULT_FOOTER_SETTINGS, ...(data?.footerSettings ?? {}) };
  const socialLinks = [
    { key: "telegram" as const, label: "Telegram", url: footer.telegramUrl },
    { key: "instagram" as const, label: "Instagram", url: footer.instagramUrl },
    { key: "youtube" as const, label: "YouTube", url: footer.youtubeUrl },
    { key: "facebook" as const, label: "Facebook", url: footer.facebookUrl },
    { key: "x" as const, label: "X", url: footer.xUrl },
    { key: "linkedin" as const, label: "LinkedIn", url: footer.linkedinUrl },
  ].filter((item) => item.url?.trim());

  return (
    <div className="shell pt-4 pb-10">
      {/* ═══════════ NAV ═══════════ */}
      <header className="top-nav mt-2">
        <BrandLogo />
        <nav className="flex items-center gap-1 flex-wrap">
          <a href="#loyihalar" className="nav-link">Loyihalar</a>
          <a href="#formula" className="nav-link">Formula</a>
          <a href="#calculator" className="nav-link">Kalkulyator</a>
          <a href="#how" className="nav-link">Jarayon</a>
          <Link href="/dashboard" className="nav-link">Kabinet</Link>
          <Link href="/become-investor" className="nav-cta">Investitsiya qilish</Link>
        </nav>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section
        ref={heroAnim.ref}
        className={`mt-16 md:mt-24 transition-all duration-1000 ${heroAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div className="max-w-3xl">
          <span className="badge badge-gold">Cheklangan · {fmtMoney(targetCapital)} so&apos;m</span>
          <h1 className="mt-5 text-4xl sm:text-5xl md:text-[3.5rem] font-bold leading-[1.08] tracking-tight text-text">
            {projectCount || "Ko&apos;p"} ta ishlaydigan IT loyihaga{" "}
            <span className="text-accent">investitsiya</span> qiling —<br />
            har oy <span className="text-gold">passiv daromad</span> oling
          </h1>
          <p className="mt-6 text-lg text-text-secondary leading-relaxed max-w-2xl">
            FathGroup real foydalanuvchilarga xizmat ko&apos;rsatadigan {projectCount || "bir nechta"} ta texnologik platformani birlashtiradi.
            Siz investitsiya qilasiz — loyihalar ishlaydi — daromadning <strong className="text-accent">80%</strong> investorlarga taqsimlanadi.
          </p>
        </div>

        {/* Hero Stats Row */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-box relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="stat-label">Faol loyihalar</div>
            <div className="stat-value relative">
              <span className="text-accent">{stats?.totals.onlineProjects ?? "—"}</span>
              <span className="text-text-muted text-base font-normal"> / {projectCount || "—"}</span>
            </div>
            <div className="text-xs text-text-muted mt-1">Real-time ma&apos;lumot</div>
          </div>
          <div className="stat-box relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="stat-label">Jami foydalanuvchilar</div>
            <div className="stat-value relative">
              <AnimatedNumber value={totalUsers} />
            </div>
            <div className="text-xs text-text-muted mt-1">{totalPaidUsers} ta pullik mijoz</div>
          </div>
          <div className="stat-box relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="stat-label">Oylik daromad</div>
            <div className="stat-value relative">
              <span className="text-accent"><AnimatedNumber value={totalRevenueUzs} /></span>
              <span className="text-text-muted text-xs font-normal"> so&apos;m</span>
            </div>
            <div className="text-xs text-green mt-1">+{stats?.totals.newClients30d ?? 0} yangi mijoz</div>
          </div>
          <div className="stat-box relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#5856D6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="stat-label">Investorlar</div>
            <div className="stat-value relative">{investorCount}</div>
            <div className="text-xs text-text-muted mt-1">{fmtUzs(currentInvested)} so&apos;m kiritilgan</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/become-investor" className="btn-primary">
            Investor bo&apos;lish
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <a href="#calculator" className="btn-secondary">
            Daromadni hisoblash
          </a>
        </div>

        {loading && (
          <p className="text-center text-sm text-text-muted mt-6 animate-pulse">
            Real-time ma&apos;lumotlar yuklanmoqda…
          </p>
        )}
      </section>

      {/* ═══════════ FUNDRAISING PROGRESS ═══════════ */}
      {fund && (
        <section className="mt-14">
          <div className="card-elevated">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold">Mablag&apos; yig&apos;ish</h3>
                <p className="text-sm text-text-muted mt-0.5">
                  {investorCount} investor · maqsad: {fmtMoney(fund.targetCapitalUzs)} so&apos;m
                </p>
              </div>
              <span className={`badge ${fund.acceptingInvestors ? "badge-live" : "badge-offline"}`}>
                {fund.acceptingInvestors ? "Investorlar qabul qilinmoqda" : "Yopilgan"}
              </span>
            </div>

            <div className="progress-track" style={{ height: "8px" }}>
              <div className="progress-fill" style={{ width: `${Math.max(Math.min(fund.progressPct, 100), 1)}%` }} />
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 mt-3 text-sm">
              <span className="text-text-secondary font-medium">
                {fmtMoney(fund.currentCapitalUzs)} so&apos;m yig&apos;ildi
              </span>
              <span className="font-bold text-accent text-lg">{fund.progressPct}%</span>
              <span className="text-text-muted">
                {fmtMoney(fund.remainingCapitalUzs)} so&apos;m joy mavjud
              </span>
            </div>
          </div>
        </section>
      )}

      <div className="divider" />

      {/* ═══════════ LOYIHALAR PORTFOLIO ═══════════ */}
      <section
        id="loyihalar"
        ref={portfolioAnim.ref}
        className={`transition-all duration-1000 ${portfolioAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <span className="badge badge-section">Loyihalar portfeli</span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          {projectCount || "Ko&apos;p"} ta ishlaydigan platforma — 1 ta investitsiya
        </h2>
        <p className="text-text-secondary mt-2 mb-8 max-w-2xl">
          Har bir loyiha real foydalanuvchilarga xizmat ko&apos;rsatadi va daromad keltiradi.
          Siz bir marta investitsiya qilasiz — barcha loyihalardan foyda olasiz.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {stats?.projects.map((p) => {
            const isExpanded = expandedProject === p.key;
            const s = p.stats;
            const projectUrl = toExternalUrl(p.url);
            return (
              <div
                key={p.key}
                className={`card-elevated cursor-pointer transition-all duration-500 hover:shadow-lg border-2 ${isExpanded ? "border-accent/30" : "border-transparent"}`}
                onClick={() => setExpandedProject(isExpanded ? null : p.key)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.gradient ?? "from-blue-500/10 to-indigo-500/10"} flex items-center justify-center text-2xl`}>
                      {p.icon ?? "📦"}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{p.name}</h3>
                      <div className="text-xs text-text-muted">{p.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={`${p.name} saytini ochish`}
                      className="flex items-center justify-center w-7 h-7 rounded-lg border border-border-light bg-white/50 text-text-muted transition-all hover:border-accent hover:text-accent hover:bg-accent/5"
                    >
                      <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                        <path d="M4.5 10.5L10.5 4.5M10.5 4.5H5.5M10.5 4.5V9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                    <span className={`badge ${s ? "badge-live" : "badge-offline"}`}>
                      {s ? "Live" : "Offline"}
                    </span>
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-sm font-medium text-accent mb-3">{p.tagline}</p>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2.5 rounded-xl bg-white/60 border border-border-light">
                    <div className="text-lg font-bold">{s?.totalUsers ?? 0}</div>
                    <div className="text-[10px] text-text-muted">Foydalanuvchilar</div>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-white/60 border border-border-light">
                    <div className="text-lg font-bold text-accent">{s?.paidUsers ?? 0}</div>
                    <div className="text-[10px] text-text-muted">Pullik mijoz</div>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-white/60 border border-border-light">
                    <div className="text-lg font-bold text-green">+{s?.newClients30d ?? 0}</div>
                    <div className="text-[10px] text-text-muted">Yangi (30 kun)</div>
                  </div>
                </div>

                {/* Revenue */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/60 border border-border-light">
                  <span className="text-sm text-text-muted">Oylik daromad</span>
                  <span className="font-mono font-bold text-accent">
                    {s ? `$${s.monthlyRevenueUsd.toFixed(2)}` : "—"}
                  </span>
                </div>

                {/* Expanded Detail */}
                <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? "max-h-96 mt-4 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="space-y-3 pt-3 border-t border-border-light">
                    <div>
                      <div className="text-xs font-bold text-danger/80 uppercase tracking-wider mb-1">Muammo</div>
                      <p className="text-sm text-text-secondary leading-relaxed">{p.problem}</p>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-green uppercase tracking-wider mb-1">Yechim</div>
                      <p className="text-sm text-text-secondary leading-relaxed">{p.solution}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Auditoriya</div>
                        <p className="text-xs text-text-secondary leading-relaxed">{p.audience}</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Biznes model</div>
                        <p className="text-xs text-text-secondary leading-relaxed">{p.model}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toggle hint */}
                <div className="flex justify-center mt-3">
                  <div className={`text-xs text-text-muted transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                    ▾ {isExpanded ? "Yopish" : "Batafsil"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Jami natija */}
        {stats && (
          <div className="card-elevated mt-6">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Umumiy portfel statistikasi</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{stats.totals.onlineProjects}/{projectCount}</div>
                <div className="text-xs text-text-muted mt-1">Faol loyiha</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{totalUsers}</div>
                <div className="text-xs text-text-muted mt-1">Jami foydalanuvchi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{totalPaidUsers}</div>
                <div className="text-xs text-text-muted mt-1">Pullik mijoz</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green">+{stats.totals.newClients30d}</div>
                <div className="text-xs text-text-muted mt-1">Yangi (30 kun)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">${stats.totals.monthlyRevenueUsd.toFixed(2)}</div>
                <div className="text-xs text-text-muted mt-1">Oylik daromad</div>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="divider" />

      {/* ═══════════ NIMA UCHUN INVESTITSIYA ═══════════ */}
      <section
        ref={statsAnim.ref}
        className={`transition-all duration-1000 ${statsAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <span className="badge badge-section">Afzalliklar</span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Nima uchun FathGroup ga investitsiya qilish kerak?
        </h2>
        <p className="text-text-secondary mt-2 mb-8 max-w-2xl">
          Oddiy jamg&apos;arma emas — bu ishlaydigan texnologik kompaniyalar portfeli.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="card group hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🔄
            </div>
            <h4 className="font-bold text-lg mb-2">Passiv daromad</h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              Siz hech narsa qilmaysiz. Loyihalar ishlaydi, mijozlar to&apos;laydi, foyda har oy hisobingizga tushadi.
            </p>
          </div>
          <div className="card group hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-green/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📊
            </div>
            <h4 className="font-bold text-lg mb-2">{projectCount || "Ko&apos;p"}x diversifikatsiya</h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              Pulingiz {projectCount || "bir nechta"} ta turli yo&apos;nalishda ishlaydi. Bitta loyiha tushsa — boshqasi ko&apos;taradi.
            </p>
          </div>
          <div className="card group hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              👁️
            </div>
            <h4 className="font-bold text-lg mb-2">To&apos;liq shaffoflik</h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              Barcha raqamlar real API orqali keladi. Daromad, mijozlar soni, to&apos;lovlar — hammasini real vaqtda ko&apos;rasiz.
            </p>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ═══════════ FORMULA ═══════════ */}
      <section
        id="formula"
        ref={formulaAnim.ref}
        className={`transition-all duration-1000 ${formulaAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <span className="badge badge-section">Shaffof formula</span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Foyda qanday taqsimlanadi?
        </h2>
        <p className="text-text-secondary mt-2 mb-8">
          3 ta oddiy qoida — hech qanday yashirin shart yo&apos;q.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="card-elevated text-center group hover:shadow-lg transition-all duration-300">
            <div className="w-14 h-14 mx-auto rounded-xl bg-gold/15 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              👤
            </div>
            <div className="text-3xl font-bold text-gold mb-1">{CREATOR_PCT}%</div>
            <div className="text-sm font-bold text-text mb-2">Yaratuvchi ulushi</div>
            <p className="text-xs text-text-muted leading-relaxed">
              Loyihalarni yaratgan va boshqarayotgan jamoa toza daromadning {CREATOR_PCT}% oladi. Bu ulush o&apos;zgarmaydi.
            </p>
          </div>

          <div className="card-elevated text-center border-2 border-accent/20 group hover:shadow-lg transition-all duration-300">
            <div className="w-14 h-14 mx-auto rounded-xl bg-accent/15 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              👥
            </div>
            <div className="text-3xl font-bold text-accent mb-1">{INVESTOR_POOL_PCT}%</div>
            <div className="text-sm font-bold text-text mb-2">Investorlar fondi</div>
            <p className="text-xs text-text-muted leading-relaxed">
              Qolgan {INVESTOR_POOL_PCT}% barcha investorlar o&apos;rtasida proporsional taqsimlanadi. Ko&apos;proq kiritgan = ko&apos;proq oladi.
            </p>
          </div>

          <div className="card-elevated text-center group hover:shadow-lg transition-all duration-300">
            <div className="w-14 h-14 mx-auto rounded-xl bg-[#5856D6]/15 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              ⚖️
            </div>
            <div className="text-sm font-bold text-text mb-2 mt-3">Dinamik ulush</div>
            <p className="text-xs text-text-muted leading-relaxed">
              Yangi investor qo&apos;shilsa — ulushlar avtomatik qayta hisoblanadi. Hamma uchun adolatli.
            </p>
            <div className="mt-3 p-2 rounded-lg bg-bg border border-border text-xs text-text-muted">
              Maqsad: <strong className="text-text">{fmtMoney(targetCapital)}</strong> so&apos;m · keyin qabul to&apos;xtaydi
            </div>
          </div>
        </div>

        {/* Formula vizual */}
        <div className="card-elevated mt-6">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Hozirgi real raqamlar bilan formula</div>

          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                <span className="text-sm text-text-muted">Oylik toza daromad</span>
                <span className="font-mono font-bold text-accent">{fmtMoney(totalRevenueUzs)} so&apos;m</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                <span className="text-sm text-text-muted">→ Yaratuvchiga ({CREATOR_PCT}%)</span>
                <span className="font-mono font-bold text-gold">{fmtMoney(Math.round(totalRevenueUzs * CREATOR_PCT / 100))} so&apos;m</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-accent/30">
                <span className="text-sm text-text-muted">→ Investorlar fondiga ({INVESTOR_POOL_PCT}%)</span>
                <span className="font-mono font-bold text-accent">{fmtMoney(Math.round(totalRevenueUzs * INVESTOR_POOL_PCT / 100))} so&apos;m</span>
              </div>
              {investorCount > 0 && (
                <>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between items-center p-3 rounded-lg bg-bg border border-border">
                    <span className="text-sm text-text-muted">Hozirgi investorlar</span>
                    <span className="font-mono font-bold">{investorCount} kishi</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <span className="text-sm text-text-muted">Har biriga o&apos;rtacha oylik foyda</span>
                    <span className="font-mono font-bold text-accent">{fmtMoney(Math.round(currentPerInvestorProfit))} so&apos;m</span>
                  </div>
                </>
              )}
            </div>

            <div className="hidden md:flex flex-col items-center justify-center gap-2 pt-4">
              <div className="w-px h-6 bg-border" />
              <div className="text-xs text-text-muted">↓</div>
              <div className="w-px h-6 bg-border" />
            </div>

            <div className="flex flex-col items-center justify-center">
              <PieChart creatorPct={CREATOR_PCT} investorPct={INVESTOR_POOL_PCT} yourPct={0} size={180} />
              <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-gold" />
                  <span className="text-text-muted">Yaratuvchi {CREATOR_PCT}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#5856D6]" />
                  <span className="text-text-muted">Investorlar {INVESTOR_POOL_PCT}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ═══════════ KALKULYATOR ═══════════ */}
      <section
        id="calculator"
        ref={calcAnim.ref}
        className={`transition-all duration-1000 ${calcAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <span className="badge badge-section">Kalkulyator</span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Qancha kiritasiz — shuncha olasiz
        </h2>
        <p className="text-text-secondary mt-2 mb-8">
          Miqdorni kiriting yoki tanlang — ulush va foyda shu zahoti hisoblanadi.
        </p>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-6">
            <div className="card-elevated">
              <label className="block text-sm font-bold text-text-secondary mb-3">
                Investitsiya miqdori (so&apos;m)
              </label>

              <input
                type="text"
                className="calc-input"
                value={fmtMoney(investAmount)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  const num = parseInt(raw, 10);
                  if (!isNaN(num) && num <= targetCapital) {
                    setInvestAmount(num);
                    setActivePreset(PRESETS.includes(num) ? num : 0);
                  } else if (raw === "") {
                    setInvestAmount(0);
                    setActivePreset(0);
                  }
                }}
                placeholder="Miqdorni kiriting"
              />

              <div className="flex flex-wrap gap-2 mt-4">
                {PRESETS.map((pr) => (
                  <button
                    key={pr}
                    className={`calc-preset ${activePreset === pr ? "active" : ""}`}
                    onClick={() => { setInvestAmount(pr); setActivePreset(pr); }}
                  >
                    {fmtUzs(pr)}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Hozir jami investitsiya</span>
                  <span className="font-mono text-text-secondary">{fmtMoney(currentInvested)} so&apos;m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Sizdan keyin jami</span>
                  <span className="font-mono font-bold text-text">{fmtMoney(newTotalInvested)} so&apos;m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Investorlar soni</span>
                  <span className="font-mono text-text-secondary">{investorCount} kishi</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Oylik toza daromad</span>
                  <span className="font-mono text-accent">{fmtMoney(totalRevenueUzs)} so&apos;m</span>
                </div>
              </div>
            </div>

            <div className="card-elevated">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Sizning natijangiz</div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="calc-result">
                  <span className="calc-result-label">Sizning ulushingiz</span>
                  <span className="calc-result-value text-accent">{poolSharePct.toFixed(2)}%</span>
                </div>
                <div className="calc-result">
                  <span className="calc-result-label">Fond ichida %</span>
                  <span className="calc-result-value text-text-secondary text-base">
                    {newTotalInvested > 0 ? ((investAmount / newTotalInvested) * 100).toFixed(1) : "0"}%
                    <span className="text-text-muted text-xs"> × 80%</span>
                  </span>
                </div>
                <div className="calc-result">
                  <span className="calc-result-label">Oylik foyda</span>
                  <span className="calc-result-value text-accent">{fmtMoney(Math.round(monthlyProfit))} so&apos;m</span>
                </div>
                <div className="calc-result">
                  <span className="calc-result-label">Yillik foyda</span>
                  <span className="calc-result-value">{fmtMoney(Math.round(yearlyProfit))} so&apos;m</span>
                </div>
              </div>

              <div className="calc-result mt-3 border-2 border-accent/30">
                <span className="calc-result-label">ROI (yillik)</span>
                <span className="calc-result-value text-xl text-accent">
                  {investAmount > 0 ? ((yearlyProfit / investAmount) * 100).toFixed(1) : "0.0"}%
                </span>
              </div>

              <div className="mt-5 p-4 rounded-lg bg-bg border border-border">
                <p className="text-xs text-text-muted leading-relaxed">
                  <strong className="text-accent">Hisob-kitob:</strong><br />
                  1. Toza oylik daromad: <strong className="text-text">{fmtMoney(totalRevenueUzs)}</strong> so&apos;m<br />
                  2. Investorlar fondiga ({INVESTOR_POOL_PCT}%): <strong className="text-text">{fmtMoney(Math.round(totalRevenueUzs * INVESTOR_POOL_PCT / 100))}</strong> so&apos;m<br />
                  3. Sizning ulushingiz: {fmtMoney(investAmount)} ÷ {fmtMoney(newTotalInvested)} × {INVESTOR_POOL_PCT}% = <strong className="text-accent">{poolSharePct.toFixed(2)}%</strong><br />
                  4. Oylik foyda: {fmtMoney(totalRevenueUzs)} × {poolSharePct.toFixed(2)}% = <strong className="text-accent">{fmtMoney(Math.round(monthlyProfit))}</strong> so&apos;m
                </p>
              </div>

              <div className="mt-4">
                <Link href="/become-investor" className="btn-primary w-full justify-center">
                  {investAmount > 0 ? `${fmtUzs(investAmount)} so'm investitsiya qilish` : "Investitsiya qilish"}
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card-elevated flex flex-col items-center py-6">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Daromad taqsimoti</div>
              <PieChart creatorPct={CREATOR_PCT} investorPct={INVESTOR_POOL_PCT} yourPct={poolSharePct} size={200} />
              <div className="space-y-2 mt-5 w-full text-xs">
                <div className="flex items-center gap-2 p-2 rounded bg-bg border border-border">
                  <div className="w-3 h-3 rounded-sm bg-gold flex-shrink-0" />
                  <span className="text-text-muted flex-1">Yaratuvchi</span>
                  <span className="font-mono font-bold text-gold">{CREATOR_PCT}%</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-bg border border-border">
                  <div className="w-3 h-3 rounded-sm bg-[#5856D6] flex-shrink-0" />
                  <span className="text-text-muted flex-1">Boshqa investorlar</span>
                  <span className="font-mono font-bold text-[#5856D6]">{otherInvestorsPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-accent/5 border border-accent/30">
                  <div className="w-3 h-3 rounded-sm bg-accent flex-shrink-0" />
                  <span className="text-text-muted flex-1"><strong className="text-accent">Siz</strong></span>
                  <span className="font-mono font-bold text-accent">{poolSharePct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="card text-xs">
              <div className="font-bold text-text-secondary mb-2">📈 O&apos;sish prognozi</div>
              <div className="space-y-2 text-text-muted">
                <div className="flex justify-between">
                  <span>Hozirgi holatda</span>
                  <span className="font-mono text-accent">{fmtMoney(Math.round(monthlyProfit))}/oy</span>
                </div>
                <div className="flex justify-between">
                  <span>Daromad 2x o&apos;ssa</span>
                  <span className="font-mono text-accent">{fmtMoney(Math.round(monthlyProfit * 2))}/oy</span>
                </div>
                <div className="flex justify-between">
                  <span>Daromad 5x o&apos;ssa</span>
                  <span className="font-mono text-accent">{fmtMoney(Math.round(monthlyProfit * 5))}/oy</span>
                </div>
                <div className="flex justify-between border-t border-border-light pt-2">
                  <span>Daromad 10x o&apos;ssa</span>
                  <span className="font-mono font-bold text-accent">{fmtMoney(Math.round(monthlyProfit * 10))}/oy</span>
                </div>
              </div>
              <p className="mt-3 text-text-muted/70 leading-relaxed">
                Loyihalar o&apos;sgan sari — ulushingiz o&apos;zgarmaydi, faqat foyda miqdori oshadi.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ═══════════ REAL MISOL ═══════════ */}
      <section>
        <span className="badge badge-section">Real misol</span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Hozirgi raqamlar bilan hisob
        </h2>
        <p className="text-text-secondary mt-2 mb-6">
          Bu haqiqiy daromad asosida hisoblab ko&apos;rsatilgan misol. Raqamlar real vaqtda API&apos;dan keladi.
        </p>

        <div className="card-elevated">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Kiritgan pul</th>
                  <th>Fond ichida %</th>
                  <th>Umumiy ulush</th>
                  <th className="text-right">Oylik foyda</th>
                </tr>
              </thead>
              <tbody>
                {investorCount > 0 && Array.from({ length: Math.min(investorCount, 4) }).map((_, i) => {
                  const avgInv = avgInvestmentPerInvestor;
                  const pInPool = currentInvested > 0 ? (avgInv / (currentInvested + investAmount)) * 100 : 0;
                  const pEff = pInPool * INVESTOR_POOL_PCT / 100;
                  return (
                    <tr key={`existing-${i}`}>
                      <td className="text-text-muted">Investor {i + 1}</td>
                      <td className="font-mono">{fmtMoney(Math.round(avgInv))} so&apos;m</td>
                      <td className="font-mono">{pInPool.toFixed(1)}%</td>
                      <td className="font-mono text-[#5856D6]">{pEff.toFixed(2)}%</td>
                      <td className="text-right font-mono">{fmtMoney(Math.round(totalRevenueUzs * pEff / 100))} so&apos;m</td>
                    </tr>
                  );
                })}
                <tr className="bg-accent/5">
                  <td className="font-bold text-accent">Siz (yangi)</td>
                  <td className="font-mono font-bold">{fmtMoney(investAmount)} so&apos;m</td>
                  <td className="font-mono font-bold">{newTotalInvested > 0 ? ((investAmount / newTotalInvested) * 100).toFixed(1) : "0"}%</td>
                  <td className="font-mono font-bold text-accent">{poolSharePct.toFixed(2)}%</td>
                  <td className="text-right font-mono font-bold text-accent">{fmtMoney(Math.round(monthlyProfit))} so&apos;m</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-light">
                  <td className="font-bold">Yaratuvchi</td>
                  <td className="font-mono text-text-muted">—</td>
                  <td className="font-mono text-text-muted">—</td>
                  <td className="font-mono font-bold text-gold">{CREATOR_PCT}%</td>
                  <td className="text-right font-mono font-bold text-gold">{fmtMoney(Math.round(totalRevenueUzs * CREATOR_PCT / 100))} so&apos;m</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ═══════════ QANDAY ISHLAYDI ═══════════ */}
      <section
        id="how"
        ref={howAnim.ref}
        className={`transition-all duration-1000 ${howAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <span className="badge badge-section">Jarayon</span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Investitsiya qilish — 4 oddiy qadam
        </h2>
        <p className="text-text-secondary mt-2 mb-8">
          Boshidan oxirigacha — sodda, tushunarli va xavfsiz.
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              num: "1",
              icon: "📝",
              title: "Ariza to'ldiring",
              desc: "3 daqiqada onlayn ariza. Shaxsiy ma'lumotlar va investitsiya miqdorini kiriting. Hech qanday majburiyat yo'q.",
              detail: "Arizani saytdan to'ldirasiz. Biz tekshirib, 24 soat ichida javob beramiz.",
            },
            {
              num: "2",
              icon: "📋",
              title: "Shartnoma imzolang",
              desc: "20/80 foydadan ulush taqsimoti rasmiy shartnomada yoziladi. Ikki tomon huquqlari himoyalanadi.",
              detail: "Shartnoma PDF formatda tayyorlanadi. Imzolashdan so'ng nusxangiz yuklab olinadi.",
            },
            {
              num: "3",
              icon: "💰",
              title: "Pul o'tkazing",
              desc: "Investitsiya summangizni bank yoki to'lov tizimi orqali o'tkazing. Kvitansiya yuklang.",
              detail: "Mablag' tushgandan so'ng — ulushingiz tizimda avtomatik hisoblanadi.",
            },
            {
              num: "4",
              icon: "📈",
              title: "Har oy foyda oling",
              desc: "Har oyning 25-sanasida foydangiz hisoblanadi va balansingizga tushadi. Yechib olish — istalgan vaqtda.",
              detail: "Kabinet orqali real vaqtda daromadni, ulushni va to'lov tarixini kuzating.",
            },
          ].map((s, i) => (
            <div key={s.num} className="card group hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              <div className="absolute -top-4 -right-2 text-[80px] font-bold text-accent/[0.04] leading-none select-none">
                {s.num}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="step-num">{s.num}</div>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <h4 className="font-bold text-lg mb-2">{s.title}</h4>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{s.desc}</p>
              <p className="text-xs text-text-muted leading-relaxed border-t border-border-light pt-3">{s.detail}</p>

              {i < 3 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-accent/30 text-2xl z-10">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ═══════════ KAFOLATLAR ═══════════ */}
      <section
        ref={guaranteeAnim.ref}
        className={`transition-all duration-1000 ${guaranteeAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <span className="badge badge-section">Kafolat va himoya</span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Sizning pulingiz xavfsiz
        </h2>
        <p className="text-text-secondary mt-2 mb-6">
          Biz investorlar ishonchini qadrlash va himoya qilish uchun aniq qoidalar qo&apos;ydik.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: "📐", title: "20/80 — o'zgarmas qoida", desc: "Yaratuvchi doim 20%, investorlar doim 80%. Bu hech qachon o'zgarmaydi — shartnomada qayd etilgan." },
            { icon: "⚖️", title: "Adolatli proporsional taqsimot", desc: "Qancha kiritdingiz — shuncha ulush. Hech kim boshqadan ko'proq olmaydi — matematika hal qiladi." },
            { icon: "📊", title: "Real-time monitoring", desc: "Barcha loyihalar daromadi, foydalanuvchilar soni, to'lovlar — hammasi API orqali real vaqtda ko'rinadi." },
            { icon: "📅", title: "Har oy 25-sanada to'lov", desc: "Foydangiz har oyning 25-sanasi avtomatik hisoblanadi. Yechib olish istalgan vaqtda mumkin." },
            { icon: "🔒", title: "500 mln limit", desc: "Fond 500 mln so'mga yetganda yangi investor qabul to'xtaydi. Mavjudlar ulushi saqlanadi." },
            { icon: "🔄", title: "Qaytarib olish huquqi", desc: "Investitsiyangizni qaytarib olmoqchi bo'lsangiz — shartnoma shartlariga ko'ra chiqish imkoniyati bor." },
          ].map((g) => (
            <div key={g.title} className="card group hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                  {g.icon}
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">{g.title}</h4>
                  <p className="text-sm text-text-secondary leading-relaxed">{g.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ═══════════ CTA ═══════════ */}
      <section
        ref={ctaAnim.ref}
        className={`text-center py-16 transition-all duration-1000 ${ctaAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <span className="badge badge-gold mb-4">Joylar cheklangan</span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          Tayyor bo&apos;lsangiz — <span className="text-accent">hozir boshlang</span>
        </h2>
        <p className="text-text-secondary text-lg mt-4 max-w-xl mx-auto">
          Ariza to&apos;ldirish 3 daqiqa. Hech qanday oldindan to&apos;lov talab qilinmaydi.
          Savollaringiz bo&apos;lsa — biz doim aloqadamiz.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/become-investor" className="btn-primary text-lg px-10 py-4">
            Investor bo&apos;lish →
          </Link>
          <Link href="/dashboard" className="btn-secondary text-lg px-8 py-4">
            Kabinetga kirish
          </Link>
        </div>
        {fund && fund.acceptingInvestors && (
          <p className="text-sm text-text-muted mt-5">
            Hozir {fmtMoney(fund.remainingCapitalUzs)} so&apos;mlik joy mavjud · {investorCount} investor qatnashmoqda
          </p>
        )}
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-8 border-t border-border">
        <div className="grid md:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="font-bold text-text-secondary mb-2">{footer.brandName}</p>
            <p className="text-text-muted leading-relaxed">{footer.legalEntity}</p>
            <p className="text-text-muted mt-2 leading-relaxed">{footer.address}</p>
          </div>

          <div>
            <p className="font-bold text-text-secondary mb-2">Kontaktlar</p>
            <div className="space-y-1 text-text-muted">
              <p>
                <a href={`mailto:${footer.email}`} className="hover:text-accent transition-colors">{footer.email}</a>
              </p>
              <p>
                <a href={`tel:${footer.phone.replace(/\s+/g, "")}`} className="hover:text-accent transition-colors">{footer.phone}</a>
              </p>
              <p>{footer.workingHours}</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-text-secondary mb-2">Huquqiy bo&apos;lim</p>
            <div className="space-y-1">
              {isExternalLink(footer.termsUrl) ? (
                <a href={toFooterLink(footer.termsUrl)} target="_blank" rel="noreferrer" className="text-text-muted hover:text-accent transition-colors block">Terms &amp; Conditions</a>
              ) : (
                <Link href={toFooterLink(footer.termsUrl)} className="text-text-muted hover:text-accent transition-colors block">Terms &amp; Conditions</Link>
              )}
              {isExternalLink(footer.privacyUrl) ? (
                <a href={toFooterLink(footer.privacyUrl)} target="_blank" rel="noreferrer" className="text-text-muted hover:text-accent transition-colors block">Privacy Policy</a>
              ) : (
                <Link href={toFooterLink(footer.privacyUrl)} className="text-text-muted hover:text-accent transition-colors block">Privacy Policy</Link>
              )}
            </div>
          </div>

          <div>
            <p className="font-bold text-text-secondary mb-2">Ijtimoiy tarmoqlar</p>
            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.key}
                    href={toFooterLink(social.url)}
                    target="_blank"
                    rel="noreferrer"
                    title={social.label}
                    className="w-9 h-9 rounded-lg border border-border-light bg-white/60 text-text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all flex items-center justify-center"
                  >
                    <SocialIcon kind={social.key} />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">Hozircha havolalar kiritilmagan</p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border-light text-xs text-text-muted/70 flex flex-wrap gap-2 justify-between">
          <p>{footerProjectNames}</p>
          <p>Barcha raqamlar real API orqali yangilanadi · © 2026</p>
        </div>
      </footer>
    </div>
  );
}