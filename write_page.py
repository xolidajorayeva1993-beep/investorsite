#!/usr/bin/env python3
"""One-shot script to write the new become-investor page."""
import pathlib, textwrap

TARGET = pathlib.Path("src/app/become-investor/page.tsx")

CONTENT = r'''"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import type { AggregatedStats, FundraisingStatus } from "@/lib/types";

/* ═══════════════ TYPES ═══════════════ */
type HubData = {
  success: boolean;
  stats: AggregatedStats;
  fundraising: FundraisingStatus;
};

type FormState = {
  fullName: string;
  passportSeries: string;
  passportNumber: string;
  phone: string;
  email: string;
  address: string;
  investmentAmountUzs: string;
  consentAccepted: boolean;
};

const initialForm: FormState = {
  fullName: "",
  passportSeries: "",
  passportNumber: "",
  phone: "",
  email: "",
  address: "",
  investmentAmountUzs: "",
  consentAccepted: false,
};

/* ═══════════════ CONSTANTS ═══════════════ */
const PRESETS = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000];
const CREATOR_PCT = 20;
const INVESTOR_POOL_PCT = 80;

/* ═══════════════ FORMATTERS ═══════════════ */
function fmtMoney(n: number): string {
  return n.toLocaleString("uz-UZ");
}
function fmtShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + " mln";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + " ming";
  return n.toString();
}
function todayStr(): string {
  const d = new Date();
  const months = [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
  ];
  return `${d.getFullYear()}-yil ${d.getDate()}-${months[d.getMonth()]}`;
}

/* ═══════════════ CONTRACT HASH ═══════════════ */
async function generateContractHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 16)
    .toUpperCase();
}

/* ═══════════════ MAIN PAGE ═══════════════ */
export default function BecomeInvestorPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState<{
    applicationId: string;
    contractId: string;
    login: string;
    password: string;
  } | null>(null);
  const [previewAmount, setPreviewAmount] = useState(10_000_000);

  // Shartnoma holatlari
  const [contractId, setContractId] = useState("");
  const [contractHash, setContractHash] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [contractScrolled, setContractScrolled] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);

  // Tasdiqlash holatlari
  const [signatureText, setSignatureText] = useState("");
  const [confirmChecks, setConfirmChecks] = useState({
    readContract: false,
    agreeTerms: false,
    understandRisks: false,
    confirmIdentity: false,
  });
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Data fetch ── */
  useEffect(() => {
    fetch("/api/hub/stats")
      .then((r) => r.json())
      .then((d: HubData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const fund = data?.fundraising;
  const totalRevenue = stats?.totals.monthlyRevenueUzs ?? 0;
  const currentInvested = fund?.currentCapitalUzs ?? 0;
  const investorCount = fund?.investorCount ?? 0;

  /* ── Preview calculator ── */
  const preview = useMemo(() => {
    if (currentInvested <= 0 && totalRevenue <= 0 && previewAmount <= 0)
      return { poolSharePct: 0, effectivePct: 0, monthlyProfit: 0 };
    const newTotal = currentInvested + previewAmount;
    const poolSharePct = newTotal > 0 ? (previewAmount / newTotal) * INVESTOR_POOL_PCT : 0;
    const monthlyProfit = totalRevenue * (poolSharePct / 100);
    return { poolSharePct, effectivePct: newTotal > 0 ? (previewAmount / newTotal) * 100 : 0, monthlyProfit };
  }, [previewAmount, currentInvested, totalRevenue]);

  /* ── Form validation ── */
  const canSubmit = useMemo(() => {
    const amt = Number(form.investmentAmountUzs);
    return (
      form.fullName.trim().length >= 3 &&
      form.passportSeries.trim().length >= 2 &&
      form.passportNumber.trim().length >= 6 &&
      form.phone.trim().length >= 9 &&
      Number.isFinite(amt) && amt >= 100_000 &&
      form.consentAccepted
    );
  }, [form]);

  const onChange = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
  };

  /* ── Computed investment values ── */
  const investAmt = Number(form.investmentAmountUzs) || 0;
  const newTotal = currentInvested + investAmt;
  const poolShare = newTotal > 0 ? (investAmt / newTotal) * INVESTOR_POOL_PCT : 0;

  /* ── Step 4 -> 5: Generate contract ── */
  const generateContract = useCallback(async () => {
    const id = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    setContractId(id);
    const raw = `${id}:${form.fullName}:${form.passportSeries}${form.passportNumber}:${investAmt}:${new Date().toISOString()}`;
    const hash = await generateContractHash(raw);
    setContractHash(hash);

    try {
      const verifyUrl = `investorsite.uz/verify/${id}/${hash}`;
      const dataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 120,
        margin: 1,
        color: { dark: "#1A1A1A", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl("");
    }

    setContractScrolled(false);
  }, [form.fullName, form.passportSeries, form.passportNumber, investAmt]);

  /* ── Contract scroll tracking ── */
  const handleContractScroll = useCallback(() => {
    if (!contractRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = contractRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setContractScrolled(true);
    }
  }, []);

  /* ── Camera / Video recording ── */
  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch {
      setCameraError("Kamera ruxsati berilmadi. Brauzer sozlamalarini tekshiring.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
      stopCamera();
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);

    // Auto-stop after 15 seconds
    setTimeout(() => {
      if (mr.state === "recording") {
        mr.stop();
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 15000);
  }, [stopCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const resetVideo = useCallback(() => {
    setVideoBlob(null);
    setVideoUrl("");
    setRecordingTime(0);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* ── Signature match ── */
  const signatureMatches = signatureText.trim().toLowerCase() === form.fullName.trim().toLowerCase();

  /* ── Full confirmation ready ── */
  const confirmReady = useMemo(() => {
    return (
      confirmChecks.readContract &&
      confirmChecks.agreeTerms &&
      confirmChecks.understandRisks &&
      confirmChecks.confirmIdentity &&
      signatureMatches &&
      videoBlob !== null
    );
  }, [confirmChecks, signatureMatches, videoBlob]);

  /* ── Submit application + contract ── */
  const onSubmit = async () => {
    if (!confirmReady) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/investor/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          passportSeries: form.passportSeries.trim().toUpperCase(),
          passportNumber: form.passportNumber.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          investmentAmountUzs: investAmt,
          consentAccepted: true,
          contractId,
          contractHash,
          contractSignedAt: new Date().toISOString(),
          videoConfirmed: true,
          poolSharePct: poolShare,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Xatolik");
      setSubmitResult(payload.data);
      setStep(7);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Step navigation ── */
  const goNext = () => {
    if (step === 4 && canSubmit) {
      generateContract();
      setStep(5);
    } else if (step === 5 && contractScrolled) {
      setStep(6);
    } else if (step < 7 && step !== 4 && step !== 5) {
      setStep((s) => Math.min(7, s + 1));
    }
  };

  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  /* ── Steps config ── */
  const steps = [
    { id: 1, title: "Portfel", sub: "4 ta platforma", icon: "\u{1F4CA}" },
    { id: 2, title: "Kalkulyator", sub: "Daromad hisoblash", icon: "\u{1F9EE}" },
    { id: 3, title: "Shartlar", sub: "20/80 qoida", icon: "\u{1F4CB}" },
    { id: 4, title: "Ariza", sub: "Ma\u2019lumotlar", icon: "\u{1F4DD}" },
    { id: 5, title: "Shartnoma", sub: "Rasmiy hujjat", icon: "\u{1F4C4}" },
    { id: 6, title: "Tasdiqlash", sub: "Imzo va video", icon: "\u2705" },
    { id: 7, title: "Tayyor", sub: "Natija", icon: "\u{1F389}" },
  ];

  const inputCls =
    "w-full border border-border-light rounded-xl px-4 py-3.5 text-sm bg-white text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all";

  return (
    <div className="shell pt-4 pb-10">
      {/* NAV */}
      <header className="top-nav mt-2">
        <div className="brand">
          <span className="brand-dot" />
          Investorsite
        </div>
        <nav className="flex items-center gap-1 flex-wrap">
          <Link href="/" className="nav-link">Bosh sahifa</Link>
          <Link href="/dashboard" className="nav-link">Kabinet</Link>
        </nav>
      </header>

      {/* HEADER */}
      <section className="mt-12 md:mt-16 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Investor <span className="text-accent">bo&apos;lish</span>
        </h1>
        <p className="text-text-secondary mt-2">
          7 qadam &mdash; portfel, kalkulyator, shartlar, ariza, shartnoma, tasdiqlash, natija.
        </p>
      </section>

      {/* LAYOUT */}
      <div className="mt-8 flex flex-col lg:flex-row gap-6">
        {/* SIDEBAR */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="card lg:sticky lg:top-24 p-5">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
              Qadamlar
            </div>
            <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0">
              {steps.map((s) => {
                const isActive = step === s.id;
                const isDone = step > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (isDone || isActive) setStep(s.id);
                    }}
                    disabled={step < s.id}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all w-full min-w-[64px] lg:min-w-0 ${
                      isActive
                        ? "border-accent bg-accent/10"
                        : isDone
                        ? "border-accent/20 bg-accent/5 cursor-pointer"
                        : "border-transparent opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isActive
                            ? "bg-accent text-white"
                            : isDone
                            ? "bg-green-500 text-white"
                            : "bg-elevated text-text-muted"
                        }`}
                      >
                        {isDone ? "\u2713" : s.icon}
                      </span>
                      <div className="hidden lg:block">
                        <div className={`text-sm font-bold ${isActive ? "text-text" : "text-text-secondary"}`}>
                          {s.title}
                        </div>
                        <div className="text-xs text-text-muted">{s.sub}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Progress */}
            <div className="mt-4 hidden lg:block">
              <div className="flex justify-between text-xs text-text-muted mb-1.5">
                <span>Jarayon</span>
                <span className="font-bold text-accent">{Math.round((step / 7) * 100)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(step / 7) * 100}%` }} />
              </div>
            </div>

            {/* Quick stats */}
            {investAmt > 0 && step >= 2 && (
              <div className="mt-5 hidden lg:block space-y-2 pt-4 border-t border-border-light">
                <div className="text-xs text-text-muted uppercase tracking-wider font-bold mb-2">
                  Sizning investitsiyangiz
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Miqdor</span>
                  <span className="font-mono font-bold text-text">{fmtMoney(investAmt)} so&apos;m</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Ulush</span>
                  <span className="font-mono font-bold text-accent">{poolShare.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Oylik foyda</span>
                  <span className="font-mono font-bold text-accent">
                    ~{fmtMoney(Math.round(totalRevenue * poolShare / 100))} so&apos;m
                  </span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 min-w-0">
          <div className="card-elevated min-h-[520px]">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="step-num">{steps[step - 1].icon}</div>
              <div>
                <h2 className="text-lg font-bold">{steps[step - 1].title}</h2>
                <p className="text-sm text-text-muted">{steps[step - 1].sub}</p>
              </div>
              <span className="ml-auto text-xs text-text-muted bg-surface px-2.5 py-1 rounded-full">
                {step}/7
              </span>
            </div>

            {/* STEP 1: PORTFEL */}
            {step === 1 && (
              <div>
                <p className="text-text-secondary text-sm mb-6">
                  Investorsite 4 ta mustaqil IT platformani birlashtiradi. Har biri haqiqiy mijozlarga xizmat ko&apos;rsatadi
                  va API orqali real daromad keltirilmoqda.
                </p>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !stats ? (
                  <p className="text-center text-text-muted py-8">API bilan bog&apos;lanib bo&apos;lmadi</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Loyiha</th>
                            <th>Holat</th>
                            <th>Mijozlar</th>
                            <th className="text-right">Daromad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.projects.map((p) => (
                            <tr key={p.key}>
                              <td>
                                <div className="font-bold">{p.name}</div>
                                <div className="text-xs text-text-muted">{p.url}</div>
                              </td>
                              <td>
                                <span className={`badge ${p.stats ? "badge-live" : "badge-offline"}`}>
                                  {p.stats ? "Live" : "Offline"}
                                </span>
                              </td>
                              <td className="font-mono">{p.stats?.activePayingClients ?? "\u2014"}</td>
                              <td className="text-right font-mono text-accent">
                                {p.stats ? `$${p.stats.monthlyRevenueUsd.toFixed(0)}` : "\u2014"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border-light">
                            <td className="font-bold text-text-secondary">Jami</td>
                            <td><span className="badge badge-live">{stats.totals.onlineProjects} faol</span></td>
                            <td className="font-mono font-bold">{stats.totals.activePayingClients}</td>
                            <td className="text-right font-mono font-bold text-accent">
                              ${stats.totals.monthlyRevenueUsd.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-accent/5 text-sm text-text-secondary">
                      {"\u{1F4E1}"} Barcha raqamlar real API orqali yangilanadi &mdash; qo&apos;lda hech narsa kiritilmagan.
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: KALKULYATOR */}
            {step === 2 && (
              <div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="stat-box text-center">
                    <div className="stat-label">Jami investitsiya</div>
                    <div className="stat-value text-lg">{currentInvested > 0 ? fmtShort(currentInvested) : "\u2014"}</div>
                  </div>
                  <div className="stat-box text-center">
                    <div className="stat-label">Oylik daromad</div>
                    <div className="stat-value text-lg">{totalRevenue > 0 ? fmtShort(totalRevenue) : "\u2014"}</div>
                  </div>
                  <div className="stat-box text-center">
                    <div className="stat-label">Investorlar</div>
                    <div className="stat-value text-lg">{investorCount}</div>
                  </div>
                </div>

                <label className="block text-sm font-bold text-text-secondary mb-3">Investitsiya miqdori</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setPreviewAmount(amt)}
                      className={`calc-preset ${previewAmount === amt ? "active" : ""}`}
                    >
                      {fmtShort(amt)}
                    </button>
                  ))}
                </div>

                <div className="mb-8">
                  <div className="text-center mb-2">
                    <span className="text-2xl font-bold font-display">{fmtMoney(previewAmount)}</span>
                    <span className="text-text-muted text-sm ml-1">so&apos;m</span>
                  </div>
                  <input
                    type="range"
                    min={1_000_000}
                    max={250_000_000}
                    step={500_000}
                    value={previewAmount}
                    onChange={(e) => setPreviewAmount(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>1 mln</span>
                    <span>250 mln</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="calc-result">
                    <span className="calc-result-label">Sizning ulushingiz</span>
                    <span className="calc-result-value">{preview.poolSharePct.toFixed(2)}%</span>
                  </div>
                  <div className="calc-result">
                    <span className="calc-result-label">Fond ichida %</span>
                    <span className="calc-result-value text-text-secondary text-base">
                      {preview.effectivePct.toFixed(1)}%
                      <span className="text-text-muted text-xs"> {"\u00D7"} 80%</span>
                    </span>
                  </div>
                  <div className="calc-result">
                    <span className="calc-result-label">Oylik foyda</span>
                    <span className="calc-result-value">
                      {preview.monthlyProfit > 0 ? fmtMoney(Math.round(preview.monthlyProfit)) + " so\u2019m" : "\u2014"}
                    </span>
                  </div>
                  <div className="calc-result">
                    <span className="calc-result-label">Yillik foyda</span>
                    <span className="calc-result-value">
                      {preview.monthlyProfit > 0 ? fmtMoney(Math.round(preview.monthlyProfit * 12)) + " so\u2019m" : "\u2014"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-white border border-border text-xs text-text-muted">
                  <strong className="text-accent">Formula (20/80):</strong> Yaratuvchi {CREATOR_PCT}% oladi.
                  Qolgan {INVESTOR_POOL_PCT}% investorlar o&apos;rtasida taqsimlanadi.
                  Ulush = Pulingiz {"\u00F7"} Jami investitsiyalar {"\u00D7"} {INVESTOR_POOL_PCT}%.
                </div>
              </div>
            )}

            {/* STEP 3: SHARTLAR */}
            {step === 3 && (
              <div>
                <p className="text-text-secondary text-sm mb-6">
                  Investitsiya shartnomasida quyidagi qoidalar rasmiy ravishda qayd etiladi.
                  Shartlarni diqqat bilan o&apos;qing.
                </p>
                {[
                  { icon: "\u{1F4D0}", title: "20/80 qoida", desc: "Toza daromadning 20% yaratuvchiga, 80% investorlar fondiga tushadi. Bu proporsiya shartnomada mustahkamlanadi." },
                  { icon: "\u2696\uFE0F", title: "Proporsional taqsimot", desc: "Sizning ulushingiz = pulingiz \u00F7 jami investitsiyalar \u00D7 80%. Hech kim boshqalardan ko\u2019proq olmaydi." },
                  { icon: "\u{1F504}", title: "Dinamik ulush", desc: "Yangi investor kelsa \u2014 barcha ulushlar avtomatik qayta hisoblanadi. Eng adolatli tizim." },
                  { icon: "\u{1F4C5}", title: "25-sana \u2014 to\u2019lov kuni", desc: "Har oyning 25-sanasida daromad hisobi yopiladi va taqsimlanadi. Bank o\u2019tkazmasi orqali." },
                  { icon: "\u{1F512}", title: "500 mln limit", desc: "Jami 500 million so\u2019m yig\u2019ilgach yangi investor qabul qilinmaydi. Shuning uchun tez harakat qiling." },
                  { icon: "\u{1F4CA}", title: "Real-time monitoring", desc: "Investor kabinetida barcha raqamlarni real vaqtda ko\u2019rib turish mumkin." },
                  { icon: "\u{1F6E1}\uFE0F", title: "Shartnoma himoyasi", desc: "Maxsus QR-kod, SHA-256 hash va video tasdiqlash bilan himoyalangan rasmiy shartnoma imzolanadi." },
                ].map((item) => (
                  <div key={item.title} className="g-row">
                    <div className="g-icon">{item.icon}</div>
                    <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-sm text-text-secondary mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 4: ARIZA FORMASI */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-text-secondary text-sm mb-4">
                  Ma&apos;lumotlaringizni kiriting. Pasport ma&apos;lumotlari shartnomada ko&apos;rsatiladi.
                </p>

                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1.5">
                    To&apos;liq ism-sharif <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => onChange("fullName", e.target.value)}
                    placeholder="Abdullaev Anvar Akbar o'g'li"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-1.5">
                      Pasport seriya <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.passportSeries}
                      onChange={(e) => onChange("passportSeries", e.target.value.toUpperCase())}
                      placeholder="AB"
                      maxLength={2}
                      required
                      className={`${inputCls} uppercase font-mono tracking-widest`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-1.5">
                      Pasport raqam <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.passportNumber}
                      onChange={(e) => onChange("passportNumber", e.target.value)}
                      placeholder="1234567"
                      maxLength={7}
                      required
                      className={`${inputCls} font-mono tracking-wider`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-1.5">
                      Telefon <span className="text-accent">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => onChange("phone", e.target.value)}
                      placeholder="+998 90 123 45 67"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-1.5">
                      Email <span className="text-xs text-text-muted font-normal">(ixtiyoriy)</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => onChange("email", e.target.value)}
                      placeholder="email@misol.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1.5">
                    Manzil <span className="text-xs text-text-muted font-normal">(ixtiyoriy)</span>
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => onChange("address", e.target.value)}
                    placeholder="Toshkent shahri, ..."
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1.5">
                    Investitsiya miqdori <span className="text-accent">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={100000}
                      step={100000}
                      value={form.investmentAmountUzs}
                      onChange={(e) => onChange("investmentAmountUzs", e.target.value)}
                      placeholder="10000000"
                      required
                      className={`${inputCls} pr-16`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                      so&apos;m
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[5_000_000, 10_000_000, 25_000_000, 50_000_000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onChange("investmentAmountUzs", String(v))}
                        className="calc-preset text-xs"
                      >
                        {v / 1_000_000}M
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-white border border-border hover:border-accent/30 transition-all">
                  <input
                    type="checkbox"
                    checked={form.consentAccepted}
                    onChange={(e) => onChange("consentAccepted", e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-[#0071E3] rounded"
                  />
                  <span className="text-sm text-text-secondary leading-relaxed">
                    Investitsiya shartlari bilan tanishdim va <strong className="text-text">roziman</strong>.
                    Ma&apos;lumotlarim shartnomada ishlatilishiga ruxsat beraman.
                  </span>
                </label>

                {!canSubmit && form.fullName && (
                  <p className="text-xs text-text-muted">
                    * Barcha majburiy maydonlarni to&apos;ldiring va shartlarga rozilik bering
                  </p>
                )}
              </div>
            )}

            {/* STEP 5: SHARTNOMA */}
            {step === 5 && (
              <div>
                <p className="text-text-secondary text-sm mb-4">
                  Quyida sizning ma&apos;lumotlaringiz asosida tayyorlangan rasmiy investitsiya shartnomasi.
                  Shartnomani <strong className="text-text">oxirigacha</strong> o&apos;qib chiqing.
                </p>

                <div
                  ref={contractRef}
                  onScroll={handleContractScroll}
                  className="contract-doc"
                >
                  <div className="contract-watermark">INVESTORSITE</div>

                  {/* Header */}
                  <div className="contract-header">
                    <h2>Investitsiya Shartnomasi</h2>
                    <div className="contract-no">{"\u2116"} {contractId}</div>
                    <div className="contract-meta">
                      <span>Toshkent shahri</span>
                      <span>{todayStr()}</span>
                    </div>
                  </div>

                  {/* I. TOMONLAR */}
                  <div className="contract-section">
                    <h3>I. Tomonlar</h3>
                    <p>
                      <strong>1.1.</strong> &quot;Investorsite&quot; platformasi (keyingi o&apos;rinlarda &mdash; &quot;Loyiha rahbari&quot;)
                      bir tomondan, va
                    </p>
                    <p>
                      <strong>1.2.</strong> Fuqaro <strong>{form.fullName || "___"}</strong>,
                      passport {form.passportSeries || "__"} {form.passportNumber || "_______"},
                      telefon: {form.phone || "___"},
                      {form.address && <> manzil: {form.address},</>}
                      {" "}(keyingi o&apos;rinlarda &mdash; &quot;Investor&quot;) ikkinchi tomondan,
                    </p>
                    <p>
                      birgalikda &quot;Tomonlar&quot; deb ataluvchi, ushbu shartnomani quyidagi shartlar asosida tuzdilar:
                    </p>
                  </div>

                  {/* II. SHARTNOMA PREDMETI */}
                  <div className="contract-section">
                    <h3>II. Shartnoma predmeti</h3>
                    <p>
                      <strong>2.1.</strong> Investor Loyiha rahbariga jami{" "}
                      <strong>
                        {fmtMoney(investAmt)} (
                        {investAmt >= 1_000_000
                          ? `${(investAmt / 1_000_000).toFixed(0)} million`
                          : `${(investAmt / 1_000).toFixed(0)} ming`}
                        ) so&apos;m
                      </strong>{" "}
                      miqdorida pul mablag&apos;ini ishonchli boshqaruv asosida beradi.
                    </p>
                    <p>
                      <strong>2.2.</strong> Loyiha rahbari ushbu mablag&apos;ni quyidagi 4 ta IT-platforma faoliyatini
                      rivojlantirish va qo&apos;llab-quvvatlash maqsadida ishlatadi: CopyTrade, FATH Robot, EPDF Services, Ticknote.
                    </p>
                    <p>
                      <strong>2.3.</strong> Mablag&apos; investitsiya fondiga kiritiladi va Investorning umumiy fonddagi
                      ulushi proporsional asosda belgilanadi.
                    </p>
                  </div>

                  {/* III. FOYDA TAQSIMOTI */}
                  <div className="contract-section">
                    <h3>III. Foyda taqsimoti</h3>
                    <p>
                      <strong>3.1.</strong> Barcha platformalar umumiy toza oylik daromadining{" "}
                      <strong>20% (yigirma foiz)</strong> Loyiha rahbariga tegadi. Bu ulush o&apos;zgartirilmaydi.
                    </p>
                    <p>
                      <strong>3.2.</strong> Qolgan <strong>80% (sakson foiz)</strong> investorlar fondi hisoblanadi va
                      barcha investorlar o&apos;rtasida proporsional taqsimlanadi.
                    </p>
                    <p>
                      <strong>3.3.</strong> Investorning ulushi quyidagi formula asosida hisoblanadi:
                    </p>
                    <div className="text-center my-4 p-4 bg-gray-50 rounded border text-sm">
                      <strong>Investor ulushi = (Investor mablag&apos;i {"\u00F7"} Jami investitsiyalar) {"\u00D7"} 80%</strong>
                    </div>
                    <p>
                      <strong>3.4.</strong> Ushbu shartnoma tuzilgan paytdagi ko&apos;rsatkichlar:
                    </p>
                    <ol>
                      <li>Fonddagi jami investitsiya: <strong>{fmtMoney(currentInvested)} so&apos;m</strong></li>
                      <li>Investor mablag&apos;i: <strong>{fmtMoney(investAmt)} so&apos;m</strong></li>
                      <li>Investordan keyin jami: <strong>{fmtMoney(newTotal)} so&apos;m</strong></li>
                      <li>Investorning hisoblangan ulushi: <strong>{poolShare.toFixed(2)}%</strong></li>
                    </ol>
                    <p>
                      <strong>3.5.</strong> Yangi investor fondga qo&apos;shilganda barcha mavjud investorlarning ulushi
                      avtomatik ravishda qayta hisoblanadi. Bu adolatli proporsiyani ta&apos;minlaydi.
                    </p>
                  </div>

                  {/* IV. TO'LOV TARTIBI */}
                  <div className="contract-section">
                    <h3>IV. To&apos;lov tartibi</h3>
                    <p>
                      <strong>4.1.</strong> Oylik foyda har oyning 25-sanasigacha hisoblab chiqiladi va Investorning
                      bank hisobiga o&apos;tkaziladi.
                    </p>
                    <p>
                      <strong>4.2.</strong> To&apos;lov muddati har oyning 25-sanasidan 5 (besh) ish kuni ichida amalga oshiriladi.
                    </p>
                    <p>
                      <strong>4.3.</strong> Investorga shaxsiy kabinet orqali barcha hisob-kitoblar real vaqt rejimida ko&apos;rsatiladi.
                    </p>
                  </div>

                  {/* V. TOMONLAR HUQUQ VA MAJBURIYATLARI */}
                  <div className="contract-section">
                    <h3>V. Tomonlar huquq va majburiyatlari</h3>
                    <p><strong>Loyiha rahbari:</strong></p>
                    <ol>
                      <li>Investitsiya mablag&apos;larini samarali boshqarishga;</li>
                      <li>Oylik moliyaviy hisobotni shaffof taqdim etishga;</li>
                      <li>Foyda taqsimotini shartnoma shartlariga muvofiq amalga oshirishga;</li>
                      <li>Investor kabinetidagi ma&apos;lumotlar dolzarbligini ta&apos;minlashga majbur.</li>
                    </ol>
                    <p><strong>Investor:</strong></p>
                    <ol>
                      <li>Shartnomada belgilangan mablag&apos;ni o&apos;z vaqtida kiritishga;</li>
                      <li>To&apos;g&apos;ri shaxsiy ma&apos;lumotlarni taqdim etishga;</li>
                      <li>Investitsiyaning riskli ekanligini tushunishga va qabul qilishga majbur.</li>
                    </ol>
                  </div>

                  {/* VI. SHARTNOMA MUDDATI */}
                  <div className="contract-section">
                    <h3>VI. Shartnoma muddati</h3>
                    <p>
                      <strong>6.1.</strong> Ushbu shartnoma imzolangan kundan boshlab 12 (o&apos;n ikki) oy muddatga tuziladi.
                    </p>
                    <p>
                      <strong>6.2.</strong> Muddat tugagach, tomonlarning birortasi 30 (o&apos;ttiz) kun oldin yozma
                      ravishda bekor qilish haqida xabar bermasa, shartnoma avtomatik ravishda yana 12 oyga uzaytiriladi.
                    </p>
                    <p>
                      <strong>6.3.</strong> Investor shartnomani muddatidan oldin bekor qilmoqchi bo&apos;lsa, 60 (oltmish)
                      kun oldin yozma bildirishnoma berishi shart. Mablag&apos; 60 kun ichida qaytariladi.
                    </p>
                  </div>

                  {/* VII. RISKLAR */}
                  <div className="contract-section">
                    <h3>VII. Risklar haqida ogohlantirish</h3>
                    <p>
                      <strong>7.1.</strong> IT-biznes investitsiyasi risklarga ega. Investitsiya miqdori kamayishi yoki yo&apos;qolishi mumkin.
                    </p>
                    <p>
                      <strong>7.2.</strong> O&apos;tgan davrdagi daromad kelajakdagi natijalarni kafolatlamaydi.
                    </p>
                    <p>
                      <strong>7.3.</strong> Loyiha rahbari investitsiya qiymatining saqlanishini kafolatlamaydi.
                    </p>
                  </div>

                  {/* VIII. FORS MAJOR */}
                  <div className="contract-section">
                    <h3>VIII. Fors-major holatlari</h3>
                    <p>
                      <strong>8.1.</strong> Tabiiy ofatlar, urush, terrorchilik, hukumat qarorlari va boshqa
                      tomonlardan nazorat qilib bo&apos;lmaydigan holatlar fors-major hisoblanadi.
                    </p>
                    <p>
                      <strong>8.2.</strong> Fors-major davomida shartnoma majburiyatlari to&apos;xtatiladi.
                    </p>
                  </div>

                  {/* IX. NIZOLARNI HAL QILISH */}
                  <div className="contract-section">
                    <h3>IX. Nizolarni hal qilish</h3>
                    <p>
                      <strong>9.1.</strong> Tomonlar o&apos;rtasidagi nizolar muzokara yo&apos;li bilan hal qilinadi.
                    </p>
                    <p>
                      <strong>9.2.</strong> Muzokara natija bermasa, O&apos;zbekiston Respublikasi qonunlari asosida sud orqali hal qilinadi.
                    </p>
                    <p>
                      <strong>9.3.</strong> Ushbu shartnoma O&apos;zbekiston Respublikasi fuqarolik qonunchiligi normalariga asoslanadi.
                    </p>
                  </div>

                  {/* X. MAXFIYLIK */}
                  <div className="contract-section">
                    <h3>X. Maxfiylik</h3>
                    <p>
                      <strong>10.1.</strong> Tomonlar ushbu shartnoma shartlari va moliyaviy ma&apos;lumotlarni
                      uchinchi shaxslarga oshkor qilmaslikka majburdirlar.
                    </p>
                    <p>
                      <strong>10.2.</strong> Investorning shaxsiy ma&apos;lumotlari O&apos;zbekiston Respublikasining
                      &quot;Shaxsga doir ma&apos;lumotlar to&apos;g&apos;risida&quot;gi Qonuniga muvofiq muhofaza qilinadi.
                    </p>
                  </div>

                  {/* IMZOLAR */}
                  <div className="contract-signatures">
                    <div className="sig-block">
                      <p className="text-xs font-bold mb-2">LOYIHA RAHBARI</p>
                      <p className="text-xs mb-1">&quot;Investorsite&quot; platformasi</p>
                      <div className="sig-line" />
                      <div className="sig-label">M.O&apos;. / Imzo</div>
                    </div>
                    <div className="sig-block">
                      <p className="text-xs font-bold mb-2">INVESTOR</p>
                      <p className="text-xs mb-1">{form.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {form.passportSeries} {form.passportNumber}
                      </p>
                      <div className="sig-line" />
                      <div className="sig-label">Imzo</div>
                    </div>
                  </div>

                  {/* QR + Hash */}
                  <div className="contract-qr">
                    <div className="flex items-center gap-6">
                      {qrDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrDataUrl} alt="QR verification" width={100} height={100} />
                      )}
                      <div className="contract-stamp">
                        <span>INVESTORSITE<br />RASMIY<br />HUJJAT</span>
                      </div>
                    </div>
                    <div className="qr-label">
                      Tekshirish kodi: {contractHash}
                    </div>
                    <div className="qr-label">
                      Shartnoma {"\u2116"}{contractId} {"\u00B7"} SHA-256 himoyalangan
                    </div>
                  </div>
                </div>

                {/* Scroll indicator */}
                {!contractScrolled && (
                  <div className="mt-3 text-center text-xs text-text-muted animate-pulse">
                    {"\u2193"} Shartnomani oxirigacha o&apos;qing {"\u2193"}
                  </div>
                )}
                {contractScrolled && (
                  <div className="mt-3 text-center">
                    <span className="badge badge-approved">{"\u2713"} Shartnoma to&apos;liq o&apos;qildi</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 6: TASDIQLASH */}
            {step === 6 && (
              <div className="space-y-6">
                <p className="text-text-secondary text-sm">
                  Shartnomani tasdiqlash uchun quyidagi barcha bosqichlarni bajaring.
                  Bu sizning himoyangiz uchun &mdash; soxtalashtirish oldini oladi.
                </p>

                {/* A) Rozilik belgilari */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    1. Rozilik bildiring
                  </div>
                  {[
                    { key: "readContract" as const, text: `Investitsiya shartnomasi \u2116${contractId} ni to\u2019liq o\u2019qib chiqdim` },
                    { key: "agreeTerms" as const, text: "20/80 foyda taqsimoti va barcha shartlarga roziman" },
                    { key: "understandRisks" as const, text: "Investitsiya risklari borligini tushunaman va qabul qilaman" },
                    { key: "confirmIdentity" as const, text: `Kiritgan ma\u2019lumotlarim to\u2019g\u2019ri va men ${form.fullName || "___"}man` },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        confirmChecks[item.key]
                          ? "border-green-300 bg-green-50"
                          : "border-border-light bg-white hover:border-accent/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={confirmChecks[item.key]}
                        onChange={(e) =>
                          setConfirmChecks((c) => ({ ...c, [item.key]: e.target.checked }))
                        }
                        className="mt-0.5 w-5 h-5 accent-green-500 rounded"
                      />
                      <span className="text-sm text-text-secondary">{item.text}</span>
                    </label>
                  ))}
                </div>

                {/* B) Elektron imzo */}
                <div>
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    2. Elektron imzo &mdash; to&apos;liq ismingizni yozing
                  </div>
                  <p className="text-xs text-text-muted mb-3">
                    Shartnomadagi ismingizni <strong className="text-text">&quot;{form.fullName}&quot;</strong> aynan
                    shu ko&apos;rinishda qayta yozing:
                  </p>
                  <input
                    type="text"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    placeholder={form.fullName}
                    className={`sig-input ${signatureMatches ? "matched" : ""}`}
                  />
                  {signatureText && !signatureMatches && (
                    <p className="text-xs text-danger mt-1">Ism to&apos;liq mos kelmayapti</p>
                  )}
                  {signatureMatches && (
                    <p className="text-xs text-green-600 mt-1">{"\u2713"} Imzo tasdiqlandi</p>
                  )}
                </div>

                {/* C) Video tasdiqlash */}
                <div>
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    3. Video tasdiqlash
                  </div>
                  <p className="text-xs text-text-muted mb-3">
                    Qisqa video yozib oling. Quyidagi matnni o&apos;qing:
                  </p>

                  <div className="p-4 rounded-xl bg-accent/5 border border-accent/15 mb-4">
                    <p className="text-sm font-bold text-accent text-center leading-relaxed">
                      &quot;Men, {form.fullName || "___"}, shartnoma raqami {contractId || "___"} ni
                      o&apos;qib chiqdim va tasdiqlayman.&quot;
                    </p>
                  </div>

                  {!videoUrl ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="video-preview">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          style={{ display: cameraReady ? "block" : "none" }}
                        />
                        {!cameraReady && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                            <span className="text-4xl mb-2">{"\u{1F4F9}"}</span>
                            <span className="text-sm">Kamera tayyor emas</span>
                          </div>
                        )}
                        {isRecording && (
                          <div className="video-overlay">
                            <div className="rec-indicator">REC {"\u00B7"} {recordingTime}s / 15s</div>
                          </div>
                        )}
                      </div>

                      {cameraError && (
                        <p className="text-xs text-danger">{cameraError}</p>
                      )}

                      <div className="flex gap-3">
                        {!cameraReady && !isRecording && (
                          <button onClick={startCamera} className="btn-secondary text-sm py-2 px-4">
                            {"\u{1F4F9}"} Kamerani yoqish
                          </button>
                        )}
                        {cameraReady && !isRecording && (
                          <button
                            onClick={startRecording}
                            className="rec-btn"
                            title="Yozishni boshlash"
                          >
                            <div className="rec-inner" />
                          </button>
                        )}
                        {isRecording && (
                          <button
                            onClick={stopRecording}
                            className="rec-btn recording"
                            title="To'xtatish"
                          >
                            <div className="rec-inner" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="video-preview">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video src={videoUrl} controls playsInline />
                      </div>
                      <div className="flex gap-3 items-center">
                        <span className="badge badge-approved">{"\u2713"} Video yozildi ({recordingTime}s)</span>
                        <button onClick={resetVideo} className="text-xs text-text-muted underline">
                          Qayta yozish
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                {submitError && (
                  <div className="flex items-center gap-2 text-sm text-danger bg-red-50 p-3 rounded-xl border border-red-200">
                    <span>{"\u2715"}</span>{submitError}
                  </div>
                )}

                <button
                  onClick={onSubmit}
                  disabled={!confirmReady || submitting}
                  className="btn-primary w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Yuborilmoqda...
                    </span>
                  ) : (
                    "Shartnomani tasdiqlash va arizani yuborish \u2192"
                  )}
                </button>

                {!confirmReady && (
                  <p className="text-xs text-text-muted text-center">
                    Yuborish uchun barcha 3 bosqichni bajaring: rozilik, imzo, video
                  </p>
                )}
              </div>
            )}

            {/* STEP 7: NATIJA */}
            {step === 7 && submitResult && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-green-50 flex items-center justify-center">
                  <span className="text-4xl">{"\u{1F389}"}</span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-2">Tabriklaymiz!</h3>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Arizangiz va shartnomangiz muvaffaqiyatli yuborildi.
                    Mutaxassislarimiz 24 soat ichida ko&apos;rib chiqadi.
                    Tasdiqlangach investitsiya kiritish uchun <strong className="text-text">bank rekvizitlari</strong> yuboriladi.
                  </p>
                </div>

                {/* Status info */}
                <div className="card text-left max-w-md mx-auto">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                    Ariza ma&apos;lumotlari
                  </div>
                  {[
                    { label: "Ariza raqami", value: submitResult.applicationId },
                    { label: "Shartnoma raqami", value: submitResult.contractId },
                    { label: "Miqdor", value: `${fmtMoney(investAmt)} so\u2019m` },
                    { label: "Ulush", value: `${poolShare.toFixed(2)}%` },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-border-light last:border-0">
                      <span className="text-sm text-text-muted">{row.label}</span>
                      <span className="font-mono font-bold text-text text-sm">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Login credentials */}
                <div className="card text-left max-w-md mx-auto border-accent/20">
                  <div className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
                    {"\u{1F511}"} Kabinet ma&apos;lumotlari
                  </div>
                  {[
                    { label: "Login (telefon)", value: submitResult.login },
                    { label: "Parol", value: submitResult.password },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-border-light last:border-0">
                      <span className="text-sm text-text-muted">{row.label}</span>
                      <span className="font-mono font-bold text-accent">{row.value}</span>
                    </div>
                  ))}
                  <p className="mt-3 text-xs text-gold bg-gold/8 rounded-lg px-3 py-2">
                    {"\u26A0\uFE0F"} Bu ma&apos;lumotlarni saqlang &mdash; kabinetga kirish uchun kerak!
                  </p>
                </div>

                {/* Next steps timeline */}
                <div className="card-elevated text-left max-w-md mx-auto">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                    Keyingi qadamlar
                  </div>
                  <div className="space-y-4">
                    <div className="timeline-item">
                      <div className="timeline-dot done">{"\u2713"}</div>
                      <div className="pt-1">
                        <div className="text-sm font-bold">Ariza yuborildi</div>
                        <div className="text-xs text-text-muted">Shartnoma imzolandi va video tasdiqlandi</div>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <div className="timeline-dot active">2</div>
                      <div className="pt-1">
                        <div className="text-sm font-bold">Ko&apos;rib chiqilmoqda</div>
                        <div className="text-xs text-text-muted">24 soat ichida natija bildiriladi</div>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <div className="timeline-dot waiting">3</div>
                      <div className="pt-1">
                        <div className="text-sm font-bold">Rekvisitlar beriladi</div>
                        <div className="text-xs text-text-muted">Tasdiqlangach investitsiya kiritish uchun bank rekvizitlari yuboriladi</div>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <div className="timeline-dot waiting">4</div>
                      <div className="pt-1">
                        <div className="text-sm font-bold">Investitsiya faollashadi</div>
                        <div className="text-xs text-text-muted">Pul tushgach ulush rasmiy belgilanadi va kabinet to&apos;liq ochiladi</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  <Link href="/dashboard" className="btn-primary">
                    Kabinetga kirish {"\u2192"}
                  </Link>
                  <Link href="/" className="btn-secondary">
                    Bosh sahifa
                  </Link>
                </div>
              </div>
            )}

            {/* NAV BUTTONS */}
            {step < 7 && (
              <div className="flex justify-between items-center mt-8 pt-5 border-t border-border">
                <button
                  disabled={step <= 1}
                  onClick={goPrev}
                  className="btn-secondary py-2.5 px-5 text-sm disabled:opacity-20"
                >
                  {"\u2190"} Orqaga
                </button>
                {step < 6 && (
                  <button
                    onClick={goNext}
                    disabled={(step === 4 && !canSubmit) || (step === 5 && !contractScrolled)}
                    className="btn-primary py-2.5 px-6 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {step === 3 ? "Arizaga" : step === 4 ? "Shartnomani ko\u2019rish" : step === 5 ? "Tasdiqlashga" : "Keyingisi"} {"\u2192"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="text-center text-sm text-text-muted py-8 mt-10 border-t border-border">
        <p className="font-bold text-text-secondary mb-1">Investorsite</p>
        <p>Barcha raqamlar real API ma&apos;lumotlariga asoslangan.</p>
        <p className="mt-1 text-xs text-text-muted/50">{"\u00A9"} 2026</p>
      </footer>
    </div>
  );
}
'''

TARGET.write_text(CONTENT, encoding='utf-8')
print(f"OK: {TARGET} written ({len(CONTENT)} chars)")
