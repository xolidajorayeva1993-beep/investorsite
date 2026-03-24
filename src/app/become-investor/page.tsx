"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import type { AggregatedStats, FundraisingStatus } from "@/lib/types";
import BrandLogo from "@/components/BrandLogo";

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
  password: string;
  passwordConfirm: string;
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
  password: "",
  passwordConfirm: "",
};

/* ═══════════════ EGASI MA'LUMOTLARI (default) ═══════════════ */
type OwnerData = {
  fullName: string;
  jshshir: string;
  passport: string;
  passportDate: string;
  activity: string;
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
  passportDate: "12.08.2017",
  activity: "Kompyuter dasturlarini ishlab chiqish xizmatlari, kompyuter o'yinlarini tashkil etish, komp'yuter yordamida matnlarni terish va bosib chiqarish xizmatlari",
  address: "Toshkent viloyati, Ohangaron tumani, Nurobod MFY, Nurobod qo'rg'oni ko'chasi 12 uy",
  guvohnoma: "5640805",
  guvohnomaDate: "15.09.2023",
  phone: "+998 93 585 05 07",
  bank: "Kapitalbank",
  hisob: "2020 8000 9051 5374 0002",
  mfo: "01057",
  inn: "303089205",
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
  } | null>(null);
  const [previewAmount, setPreviewAmount] = useState(10_000_000);
  const [OWNER, setOwner] = useState<OwnerData>(DEFAULT_OWNER);

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

    fetch("/api/owner")
      .then((r) => r.json())
      .then((d) => { if (d.success && d.owner) setOwner(d.owner); })
      .catch(() => {});
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
      form.consentAccepted &&
      form.password.length >= 6 &&
      form.password === form.passwordConfirm
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
      // Video validation
      if (!videoBlob) {
        throw new Error("Video yozilmagan!");
      }
      if (videoBlob.size === 0) {
        throw new Error("Video bo'sh bo'lib qoldi, iltimos qayta yozib ko'ring");
      }
      if (recordingTime < 1) {
        throw new Error("Video juda qisqa, kamida 1 soniya kerak");
      }

      console.log("Starting application submission", {
        investAmt,
        poolShare,
        videoSize: videoBlob.size,
        recordingTime,
      });

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
          password: form.password,
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

      // Upload video confirmation
      if (videoBlob && payload.data?.applicationId) {
        // Firestore yozilishiga vaqt berish uchun kichik delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const fd = new FormData();
        fd.append("video", videoBlob, "confirmation.webm");
        fd.append("applicationId", payload.data.applicationId);

        console.log("Video upload starting", {
          applicationId: payload.data.applicationId,
          videoSize: videoBlob.size,
          videoType: videoBlob.type,
        });

        const videoRes = await fetch("/api/investor/upload-video", { method: "POST", body: fd });
        const videoPayload = await videoRes.json().catch(() => ({
          ok: false,
          error: "Serverdan javob olish mumkin bo'lmadi",
        }));

        console.log("Video upload response", { ok: videoRes.ok, payload: videoPayload });

        if (!videoRes.ok || !videoPayload.ok) {
          throw new Error(
            videoPayload.error ||
              `Video saqlashda xatolik (${videoRes.status})`
          );
        }
      }

      setStep(7);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Step navigation ── */
  const goNext = () => {
    if (step === 1) {
      setStep(4);
    } else if (step === 4 && canSubmit) {
      generateContract();
      setStep(5);
    } else if (step === 5 && contractScrolled) {
      setStep(6);
    }
  };

  const goPrev = () => {
    if (step === 4) setStep(1);
    else if (step === 5) setStep(4);
    else if (step === 6) setStep(5);
    else setStep(1);
  };

  const getFunnelStep = (legacyStep: number) => {
    if (legacyStep <= 3) return 1;
    if (legacyStep === 4) return 2;
    if (legacyStep === 5) return 3;
    return 4;
  };

  const activeFunnelStep = getFunnelStep(step);
  const funnelProgress = (activeFunnelStep / 4) * 100;

  /* ── Steps config ── */
  const steps = [
    { id: 1, title: "Loyiha va daromad", sub: "Portfel + kalkulyator", icon: "📊", targetStep: 1 },
    { id: 2, title: "Ariza", sub: "Ma'lumotlar", icon: "\u{1F4DD}", targetStep: 4 },
    { id: 3, title: "Shartnoma", sub: "Rasmiy hujjat", icon: "\u{1F4C4}", targetStep: 5 },
    { id: 4, title: "Tasdiqlash", sub: "Imzo va video", icon: "\u2705", targetStep: 6 },
  ];

  const inputCls =
    "w-full border border-border-light rounded-xl px-4 py-3.5 text-sm bg-white text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all";

  return (
    <div className="shell pt-4 pb-10">
      {/* NAV */}
      <header className="top-nav mt-2">
        <BrandLogo />
        <nav className="w-full md:w-auto flex items-center gap-1">
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
          4 qadamda ariza: loyiha va daromad, ariza, shartnoma, tasdiqlash.
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
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-1.5">
              {steps.map((s) => {
                const isActive = activeFunnelStep === s.id;
                const isDone = activeFunnelStep > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (isDone || isActive) setStep(s.targetStep);
                    }}
                    disabled={activeFunnelStep < s.id}
                    className={`text-left px-2.5 py-2 rounded-xl border transition-all w-full min-w-0 ${
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
                      <div className="block min-w-0">
                        <div className={`text-[11px] sm:text-xs lg:text-sm font-bold truncate ${isActive ? "text-text" : "text-text-secondary"}`}>
                          {s.title}
                        </div>
                        <div className="hidden lg:block text-xs text-text-muted">{s.sub}</div>
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
                <span className="font-bold text-accent">{Math.round(funnelProgress)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${funnelProgress}%` }} />
              </div>
            </div>

            {/* Quick stats */}
            {investAmt > 0 && activeFunnelStep >= 2 && (
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
              <div className="step-num">{steps[activeFunnelStep - 1].icon}</div>
              <div>
                <h2 className="text-lg font-bold">{steps[activeFunnelStep - 1].title}</h2>
                <p className="text-sm text-text-muted">{steps[activeFunnelStep - 1].sub}</p>
              </div>
              <span className="ml-auto text-xs text-text-muted bg-surface px-2.5 py-1 rounded-full">
                {activeFunnelStep}/4
              </span>
            </div>

            {/* STEP 1: PORTFEL */}
            {step === 1 && (
              <div>
                <p className="text-text-secondary text-sm mb-6">
                  3 daqiqada ariza yuborishingiz uchun asosiy ma&apos;lumotlar quyida jamlangan:
                  real platformalar, tez kalkulyator va muhim qoidalar.
                </p>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !stats ? (
                  <p className="text-center text-text-muted py-8">API bilan bog&apos;lanib bo&apos;lmadi</p>
                ) : (
                  <>
                    <div className="hidden sm:block overflow-x-auto">
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
                    <div className="sm:hidden space-y-2">
                      {stats.projects.map((p) => (
                        <div key={p.key} className="rounded-lg border border-border-light bg-bg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold">{p.name}</div>
                              <div className="text-xs text-text-muted break-all">{p.url}</div>
                            </div>
                            <span className={`badge ${p.stats ? "badge-live" : "badge-offline"}`}>
                              {p.stats ? "Live" : "Offline"}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-text-muted">Mijozlar</span>
                            <span className="font-mono font-bold">{p.stats?.activePayingClients ?? "\u2014"}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs">
                            <span className="text-text-muted">Daromad</span>
                            <span className="font-mono font-bold text-accent">{p.stats ? `$${p.stats.monthlyRevenueUsd.toFixed(0)}` : "\u2014"}</span>
                          </div>
                        </div>
                      ))}
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                        <div className="text-xs text-text-muted">Jami</div>
                        <div className="mt-1 text-sm font-bold">{stats.totals.onlineProjects} faol loyiha · {stats.totals.activePayingClients} mijoz</div>
                        <div className="text-sm font-mono font-bold text-accent mt-1">${stats.totals.monthlyRevenueUsd.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-accent/5 text-sm text-text-secondary">
                      {"\u{1F4E1}"} Barcha raqamlar real API orqali yangilanadi &mdash; qo&apos;lda hech narsa kiritilmagan.
                    </div>

                    <div className="mt-4 rounded-xl border border-border-light bg-white p-4">
                      <div className="text-sm font-bold">Tez kalkulyator</div>
                      <p className="text-xs text-text-muted mt-1 mb-3">Mablag&apos; kiriting va taxminiy ulushingizni ko&apos;ring.</p>

                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-3">
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                        <div className="rounded-lg border border-border-light bg-bg p-2.5">
                          <div className="text-text-muted">Miqdor</div>
                          <div className="font-bold mt-0.5">{fmtMoney(previewAmount)} so&apos;m</div>
                        </div>
                        <div className="rounded-lg border border-border-light bg-bg p-2.5">
                          <div className="text-text-muted">Ulush</div>
                          <div className="font-bold text-accent mt-0.5">{preview.poolSharePct.toFixed(2)}%</div>
                        </div>
                        <div className="rounded-lg border border-border-light bg-bg p-2.5">
                          <div className="text-text-muted">Oylik foyda</div>
                          <div className="font-bold text-accent mt-0.5">
                            {preview.monthlyProfit > 0 ? fmtMoney(Math.round(preview.monthlyProfit)) + " so&apos;m" : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-border-light bg-white p-4">
                      <div className="text-sm font-bold mb-2">Asosiy qoidalar</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
                        <div className="rounded-lg border border-border-light bg-bg p-2.5">20% loyiha rahbariga, 80% investorlarga taqsimlanadi.</div>
                        <div className="rounded-lg border border-border-light bg-bg p-2.5">Ulush dinamik: yangi investor kelganda qayta hisoblanadi.</div>
                        <div className="rounded-lg border border-border-light bg-bg p-2.5">To&apos;lovlar odatda har oy 25-sanadan keyin beriladi.</div>
                        <div className="rounded-lg border border-border-light bg-bg p-2.5">Jami fond 500 mln so&apos;mga yetganda qabul yopiladi.</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: KALKULYATOR */}
            {step === 2 && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
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
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  Formani to&apos;ldiring. Ma&apos;lumotlar shartnomaga avtomatik kiritiladi.
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

                {/* Parol */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-1.5">
                      Parol <span className="text-accent">*</span>
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => onChange("password", e.target.value)}
                      placeholder="Kamida 6 belgi"
                      minLength={6}
                      required
                      className={inputCls}
                    />
                    {form.password && form.password.length < 6 && (
                      <p className="text-xs text-danger mt-1">Kamida 6 ta belgi kerak</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-1.5">
                      Parolni tasdiqlang <span className="text-accent">*</span>
                    </label>
                    <input
                      type="password"
                      value={form.passwordConfirm}
                      onChange={(e) => onChange("passwordConfirm", e.target.value)}
                      placeholder="Parolni qayta kiriting"
                      required
                      className={inputCls}
                    />
                    {form.passwordConfirm && form.password !== form.passwordConfirm && (
                      <p className="text-xs text-danger mt-1">Parollar mos kelmayapti</p>
                    )}
                  </div>
                </div>

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
                  Sizning ma&apos;lumotlaringiz asosida shartnoma tayyorlandi.
                  Davom etish uchun <strong className="text-text">oxirigacha</strong> o&apos;qing.
                </p>

                <div
                  ref={contractRef}
                  onScroll={handleContractScroll}
                  className="contract-doc"
                  id="contract-printable"
                >
                  {/* Header */}
                  <div className="contract-header">
                    <h2>INVESTITSIYA SHARTNOMASI</h2>
                    <div className="contract-no">{"\u2116"} {contractId}</div>
                    <div className="contract-meta">
                      <span>Toshkent shahri</span>
                      <span>{todayStr()}</span>
                    </div>
                  </div>

                  {/* I. TOMONLAR */}
                  <div className="contract-section">
                    <h3>1. TOMONLAR</h3>
                    <p>
                      <strong>Loyiha rahbari:</strong> YaTT {OWNER.fullName}, guvohnoma {"\u2116"}{OWNER.guvohnoma} ({OWNER.guvohnomaDate}), JSHSHIR: {OWNER.jshshir}, passport: {OWNER.passport}, manzil: {OWNER.address}, tel: {OWNER.phone} &mdash; bir tomondan,
                    </p>
                    <p>
                      <strong>Investor:</strong> {form.fullName || "___"}, passport: {form.passportSeries || "__"} {form.passportNumber || "_______"}, tel: {form.phone || "___"}{form.address ? `, manzil: ${form.address}` : ""} &mdash; ikkinchi tomondan,
                    </p>
                    <p>birgalikda &laquo;Tomonlar&raquo; deb ataluvchi, ushbu shartnomani tuzdilar.</p>
                  </div>

                  {/* 2. PREDMET */}
                  <div className="contract-section">
                    <h3>2. SHARTNOMA PREDMETI</h3>
                    <p>
                      <strong>2.1.</strong> Investor <strong>{fmtMoney(investAmt)} ({investAmt >= 1_000_000 ? `${(investAmt / 1_000_000).toFixed(0)} million` : `${(investAmt / 1_000).toFixed(0)} ming`}) so&apos;m</strong> miqdorida mablag&apos;ni FathGroup loyihalarini rivojlantirish maqsadida investitsiya qiladi.
                    </p>
                    <p>
                      <strong>2.2.</strong> Mablag&apos; CopyTrade, FATH Robot, EPDF Services, Ticknote platformalarini rivojlantirish, marketing, server xarajatlari va operatsion faoliyat uchun sarflanadi.
                    </p>
                    <p>
                      <strong>2.3.</strong> Investitsiya qaytarilmaydigan xarakter kasb etadi &mdash; investor buning o&apos;rniga toza foydadan proporsional ulush olish huquqiga ega bo&apos;ladi.
                    </p>
                  </div>

                  {/* 3. FOYDA TAQSIMOTI */}
                  <div className="contract-section">
                    <h3>3. FOYDA TAQSIMOTI</h3>
                    <p>
                      <strong>3.1.</strong> Toza oylik daromadning <strong>20%</strong> Loyiha rahbariga, <strong>80%</strong> investorlar fondiga taqsimlanadi.
                    </p>
                    <p>
                      <strong>3.2.</strong> Formula: <em>Investor ulushi = (Investor mablag&apos;i {"\u00F7"} Jami investitsiyalar) {"\u00D7"} 80%</em>.
                    </p>
                    <p>
                      <strong>3.3.</strong> Hozirgi ko&apos;rsatkichlar: jami fond &mdash; {fmtMoney(currentInvested)} so&apos;m, investor mablag&apos;i &mdash; {fmtMoney(investAmt)} so&apos;m, yangi jami &mdash; {fmtMoney(newTotal)} so&apos;m, <strong>investor ulushi &mdash; {poolShare.toFixed(2)}%</strong>.
                    </p>
                    <p>
                      <strong>3.4.</strong> Yangi investor qo&apos;shilganda ulushlar avtomatik qayta hisoblanadi.
                    </p>
                  </div>

                  {/* 4. TO'LOV */}
                  <div className="contract-section">
                    <h3>4. TO&apos;LOV TARTIBI</h3>
                    <p>
                      <strong>4.1.</strong> Oylik foyda har oyning 25-sanasigacha hisoblanadi va 5 ish kuni ichida bank o&apos;tkazmasi orqali to&apos;lanadi.
                    </p>
                    <p>
                      <strong>4.2.</strong> Investor shaxsiy kabinet orqali barcha hisob-kitoblarni real vaqtda ko&apos;radi.
                    </p>
                  </div>

                  {/* 5. HUQUQ VA MAJBURIYATLAR */}
                  <div className="contract-section">
                    <h3>5. HUQUQ VA MAJBURIYATLAR</h3>
                    <p>
                      <strong>Loyiha rahbari majbur:</strong> mablag&apos;larni samarali boshqarishga, oylik hisobot berishga, foyda taqsimotini o&apos;z vaqtida amalga oshirishga.
                    </p>
                    <p>
                      <strong>Investor majbur:</strong> mablag&apos;ni o&apos;z vaqtida kiritishga, to&apos;g&apos;ri shaxsiy ma&apos;lumot berishga, investitsiya risklarini qabul qilishga.
                    </p>
                  </div>

                  {/* 6. MUDDAT */}
                  <div className="contract-section">
                    <h3>6. MUDDAT VA CHIQISH TARTIBI</h3>
                    <p>
                      <strong>6.1.</strong> Shartnoma 12 oy muddatga tuziladi, 30 kun oldin yozma xabarsiz avtomatik uzayadi.
                    </p>
                    <p>
                      <strong>6.2.</strong> Investor istalgan vaqtda o&apos;z ulushini boshqa shaxsga sotish huquqiga ega. Sotish narxi tomonlar kelishuviga ko&apos;ra belgilanadi.
                    </p>
                    <p>
                      <strong>6.3.</strong> FathGroup, o&apos;z imkoniyatlariga ko&apos;ra, investorning ulushini sotib olish huquqiga ega. Bu holda narx ikki tomon kelishuviga asoslanadi.
                    </p>
                    <p>
                      <strong>6.4.</strong> Investitsiya loyiha hisobidan qaytarilmaydi. Chiqish faqat ulushni sotish orqali amalga oshiriladi.
                    </p>
                  </div>

                  {/* 7. RISKLAR VA BOSHQA */}
                  <div className="contract-section">
                    <h3>7. RISKLAR, FORS-MAJOR, NIZOLAR</h3>
                    <p>
                      <strong>7.1.</strong> IT-biznes investitsiyasi risklarga ega. Investitsiya miqdori kamayishi mumkin. O&apos;tgan daromad kelajakni kafolatlamaydi.
                    </p>
                    <p>
                      <strong>7.2.</strong> Fors-major (tabiiy ofat, urush, hukumat qarorlari) davomida majburiyatlar to&apos;xtatiladi.
                    </p>
                    <p>
                      <strong>7.3.</strong> Nizolar muzokara, keyin O&apos;zbekiston Respublikasi qonunlari asosida sud orqali hal qilinadi.
                    </p>
                    <p>
                      <strong>7.4.</strong> Tomonlar shartnoma shartlari va moliyaviy ma&apos;lumotlarni maxfiy saqlaydi. Shaxsiy ma&apos;lumotlar {"\u00AB"}Shaxsga doir ma&apos;lumotlar to&apos;g&apos;risida{"\u00BB"}gi Qonun asosida himoyalanadi.
                    </p>
                  </div>

                  {/* REKVIZITLAR */}
                  <div className="contract-section">
                    <h3>8. TOMONLAR REKVIZITLARI</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "11px", lineHeight: 1.5 }}>
                      <div>
                        <p className="font-bold mb-1">LOYIHA RAHBARI:</p>
                        <p>YaTT {OWNER.fullName}</p>
                        <p>JSHSHIR: {OWNER.jshshir}</p>
                        <p>Passport: {OWNER.passport}</p>
                        <p>Guvohnoma: {"\u2116"}{OWNER.guvohnoma}</p>
                        <p>Manzil: {OWNER.address}</p>
                        <p>Tel: {OWNER.phone}</p>
                        <p>Bank: {OWNER.bank}</p>
                        <p>H/r: {OWNER.hisob}</p>
                        <p>MFO: {OWNER.mfo}</p>
                        <p>INN: {OWNER.inn}</p>
                      </div>
                      <div>
                        <p className="font-bold mb-1">INVESTOR:</p>
                        <p>{form.fullName || "___"}</p>
                        <p>Passport: {form.passportSeries} {form.passportNumber}</p>
                        <p>Tel: {form.phone || "___"}</p>
                        {form.email && <p>Email: {form.email}</p>}
                        {form.address && <p>Manzil: {form.address}</p>}
                      </div>
                    </div>
                  </div>

                  {/* IMZOLAR */}
                  <div className="contract-signatures">
                    <div className="sig-block">
                      <p className="text-xs font-bold mb-1">LOYIHA RAHBARI</p>
                      <p style={{ fontSize: "10px" }}>{OWNER.fullName}</p>
                      <div className="sig-line" />
                      <div className="sig-label">Imzo</div>
                    </div>
                    <div className="sig-block">
                      <p className="text-xs font-bold mb-1">INVESTOR</p>
                      <p style={{ fontSize: "10px" }}>{form.fullName}</p>
                      <div className="sig-line" />
                      <div className="sig-label">Imzo</div>
                    </div>
                  </div>

                  {/* QR + Hash */}
                  <div className="contract-qr">
                    {qrDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="QR verification" width={80} height={80} />
                    )}
                    <div className="qr-label">
                      Tekshirish: {contractHash} {"\u00B7"} {"\u2116"}{contractId} {"\u00B7"} SHA-256
                    </div>
                  </div>
                </div>

                {/* Scroll indicator */}
                {!contractScrolled && (
                  <div className="mt-3 text-center text-xs text-text-muted animate-pulse">
                    {"\u2193"} Oxirigacha o&apos;qing {"\u2193"}
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
                  Arizani yakunlash uchun 3 tasdiqni bajaring: rozilik, imzo, video.
                </p>

                {/* A) Rozilik belgilari */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    1. Rozilik bildiring
                  </div>
                  {[
                    { key: "readContract" as const, text: `Investitsiya shartnomasi \u2116${contractId} ni to\u2019liq o\u2019qib chiqdim` },
                    { key: "agreeTerms" as const, text: "20/80 qoidasi, risklar va ma’lumotlarim to‘g‘riligini tasdiqlayman" },
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
                    3-15 soniyalik video yozib, quyidagi matnni o&apos;qing:
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
                    Yuborish uchun barcha tasdiqlar to&apos;liq bo&apos;lishi kerak
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
                  <div className="flex justify-between items-center py-2.5 border-b border-border-light">
                    <span className="text-sm text-text-muted">Login (telefon)</span>
                    <span className="font-mono font-bold text-accent">{submitResult.login}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-sm text-text-muted">Parol</span>
                    <span className="font-mono font-bold text-accent">Siz tanlagan parol</span>
                  </div>
                  <p className="mt-3 text-xs text-gold bg-gold/8 rounded-lg px-3 py-2">
                    {"\u26A0\uFE0F"} Bu ma&apos;lumotlarni saqlang &mdash; kabinetga kirish uchun kerak!
                  </p>
                </div>

                {/* Download shartnoma */}
                <div className="card text-center max-w-md mx-auto">
                  <p className="text-sm text-text-secondary mb-3">Shartnomani yuklab oling va saqlang</p>
                  <button
                    onClick={() => {
                      const w = window.open("", "_blank");
                      if (!w) return;
                      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shartnoma ${contractId}</title><style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Times New Roman', serif; font-size: 11.5px; line-height: 1.55; padding: 24px 32px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
                        h2 { text-align: center; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; font-weight: 700; }
                        h3 { font-size: 11.5px; text-transform: uppercase; font-weight: 700; margin-top: 8px; margin-bottom: 3px; padding-bottom: 2px; border-bottom: 1px solid #eee; }
                        p { margin-bottom: 2px; text-align: justify; }
                        strong { font-weight: 700; }
                        em { font-style: italic; }
                        .header { text-align: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1.5px solid #1a1a1a; }
                        .no { text-align: center; font-size: 11px; color: #555; font-style: italic; }
                        .meta { display: flex; justify-content: space-between; font-size: 11px; color: #444; margin-top: 6px; }
                        .section { margin-bottom: 8px; }
                        .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #ccc; }
                        .sig-block { text-align: center; font-size: 10px; }
                        .sig-line { border-bottom: 1px solid #1a1a1a; height: 28px; margin-bottom: 2px; }
                        .sig-label { font-size: 9px; color: #666; }
                        .rekvizitlar { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 11px; line-height: 1.5; }
                        .qr { text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #ccc; font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; }
                        .qr img { display: block; margin: 0 auto 4px; }
                        .top-line { height: 3px; background: linear-gradient(90deg, #0071E3, #BF5AF2, #0071E3); margin-bottom: 16px; }
                        @media print { body { padding: 16px; } }
                      </style></head><body>
                      <div class="top-line"></div>
                      <div class="header">
                        <h2>INVESTITSIYA SHARTNOMASI</h2>
                        <div class="no">№ ${contractId}</div>
                        <div class="meta"><span>Toshkent shahri</span><span>${todayStr()}</span></div>
                      </div>
                      <div class="section"><h3>1. TOMONLAR</h3>
                        <p><strong>Loyiha rahbari:</strong> YaTT ${OWNER.fullName}, guvohnoma №${OWNER.guvohnoma} (${OWNER.guvohnomaDate}), JSHSHIR: ${OWNER.jshshir}, passport: ${OWNER.passport}, manzil: ${OWNER.address}, tel: ${OWNER.phone} — bir tomondan,</p>
                        <p><strong>Investor:</strong> ${form.fullName}, passport: ${form.passportSeries} ${form.passportNumber}, tel: ${form.phone}${form.address ? ', manzil: ' + form.address : ''} — ikkinchi tomondan,</p>
                        <p>birgalikda «Tomonlar» deb ataluvchi, ushbu shartnomani tuzdilar.</p>
                      </div>
                      <div class="section"><h3>2. SHARTNOMA PREDMETI</h3>
                        <p><strong>2.1.</strong> Investor <strong>${fmtMoney(investAmt)} (${investAmt >= 1000000 ? (investAmt / 1000000).toFixed(0) + ' million' : (investAmt / 1000).toFixed(0) + ' ming'}) so'm</strong> miqdorida mablag'ni FathGroup loyihalarini rivojlantirish maqsadida investitsiya qiladi.</p>
                        <p><strong>2.2.</strong> Mablag' CopyTrade, FATH Robot, EPDF Services, Ticknote platformalarini rivojlantirish, marketing, server xarajatlari va operatsion faoliyat uchun sarflanadi.</p>
                        <p><strong>2.3.</strong> Investitsiya qaytarilmaydigan xarakter kasb etadi — investor buning o'rniga toza foydadan proporsional ulush olish huquqiga ega bo'ladi.</p>
                      </div>
                      <div class="section"><h3>3. FOYDA TAQSIMOTI</h3>
                        <p><strong>3.1.</strong> Toza oylik daromadning <strong>20%</strong> Loyiha rahbariga, <strong>80%</strong> investorlar fondiga taqsimlanadi.</p>
                        <p><strong>3.2.</strong> Formula: <em>Investor ulushi = (Investor mablag'i ÷ Jami investitsiyalar) × 80%</em>.</p>
                        <p><strong>3.3.</strong> Hozirgi ko'rsatkichlar: jami fond — ${fmtMoney(currentInvested)} so'm, investor mablag'i — ${fmtMoney(investAmt)} so'm, yangi jami — ${fmtMoney(newTotal)} so'm, <strong>investor ulushi — ${poolShare.toFixed(2)}%</strong>.</p>
                        <p><strong>3.4.</strong> Yangi investor qo'shilganda ulushlar avtomatik qayta hisoblanadi.</p>
                      </div>
                      <div class="section"><h3>4. TO'LOV TARTIBI</h3>
                        <p><strong>4.1.</strong> Oylik foyda har oyning 25-sanasigacha hisoblanadi va 5 ish kuni ichida bank o'tkazmasi orqali to'lanadi.</p>
                        <p><strong>4.2.</strong> Investor shaxsiy kabinet orqali barcha hisob-kitoblarni real vaqtda ko'radi.</p>
                      </div>
                      <div class="section"><h3>5. HUQUQ VA MAJBURIYATLAR</h3>
                        <p><strong>Loyiha rahbari majbur:</strong> mablag'larni samarali boshqarishga, oylik hisobot berishga, foyda taqsimotini o'z vaqtida amalga oshirishga.</p>
                        <p><strong>Investor majbur:</strong> mablag'ni o'z vaqtida kiritishga, to'g'ri shaxsiy ma'lumot berishga, investitsiya risklarini qabul qilishga.</p>
                      </div>
                      <div class="section"><h3>6. MUDDAT VA CHIQISH TARTIBI</h3>
                        <p><strong>6.1.</strong> Shartnoma 12 oy muddatga tuziladi, 30 kun oldin yozma xabarsiz avtomatik uzayadi.</p>
                        <p><strong>6.2.</strong> Investor istalgan vaqtda o'z ulushini boshqa shaxsga sotish huquqiga ega. Sotish narxi tomonlar kelishuviga ko'ra belgilanadi.</p>
                        <p><strong>6.3.</strong> FathGroup, o'z imkoniyatlariga ko'ra, investorning ulushini sotib olish huquqiga ega. Narx ikki tomon kelishuviga asoslanadi.</p>
                        <p><strong>6.4.</strong> Investitsiya loyiha hisobidan qaytarilmaydi. Chiqish faqat ulushni sotish orqali amalga oshiriladi.</p>
                      </div>
                      <div class="section"><h3>7. RISKLAR, FORS-MAJOR, NIZOLAR</h3>
                        <p><strong>7.1.</strong> IT-biznes investitsiyasi risklarga ega. Investitsiya miqdori kamayishi mumkin. O'tgan daromad kelajakni kafolatlamaydi.</p>
                        <p><strong>7.2.</strong> Fors-major (tabiiy ofat, urush, hukumat qarorlari) davomida majburiyatlar to'xtatiladi.</p>
                        <p><strong>7.3.</strong> Nizolar muzokara, keyin O'zbekiston Respublikasi qonunlari asosida sud orqali hal qilinadi.</p>
                        <p><strong>7.4.</strong> Tomonlar shartnoma shartlari va moliyaviy ma'lumotlarni maxfiy saqlaydi.</p>
                      </div>
                      <div class="section"><h3>8. TOMONLAR REKVIZITLARI</h3>
                        <div class="rekvizitlar">
                          <div>
                            <p><strong>LOYIHA RAHBARI:</strong></p>
                            <p>YaTT ${OWNER.fullName}</p>
                            <p>JSHSHIR: ${OWNER.jshshir}</p>
                            <p>Passport: ${OWNER.passport}</p>
                            <p>Guvohnoma: №${OWNER.guvohnoma}</p>
                            <p>Manzil: ${OWNER.address}</p>
                            <p>Tel: ${OWNER.phone}</p>
                            <p>Bank: ${OWNER.bank}</p>
                            <p>H/r: ${OWNER.hisob}</p>
                            <p>MFO: ${OWNER.mfo}</p>
                            <p>INN: ${OWNER.inn}</p>
                          </div>
                          <div>
                            <p><strong>INVESTOR:</strong></p>
                            <p>${form.fullName}</p>
                            <p>Passport: ${form.passportSeries} ${form.passportNumber}</p>
                            <p>Tel: ${form.phone}</p>
                            ${form.email ? '<p>Email: ' + form.email + '</p>' : ''}
                            ${form.address ? '<p>Manzil: ' + form.address + '</p>' : ''}
                          </div>
                        </div>
                      </div>
                      <div class="sigs">
                        <div class="sig-block"><p><strong>LOYIHA RAHBARI</strong></p><p>${OWNER.fullName}</p><div class="sig-line"></div><div class="sig-label">Imzo</div></div>
                        <div class="sig-block"><p><strong>INVESTOR</strong></p><p>${form.fullName}</p><div class="sig-line"></div><div class="sig-label">Imzo</div></div>
                      </div>
                      <div class="qr">
                        ${qrDataUrl ? '<img src="' + qrDataUrl + '" width="80" height="80" alt="QR">' : ''}
                        <div>Tekshirish: ${contractHash} · №${contractId} · SHA-256</div>
                      </div>
                      </body></html>`;
                      w.document.write(html);
                      w.document.close();
                      setTimeout(() => w.print(), 500);
                    }}
                    className="btn-primary py-3 px-6"
                  >
                    {"\u{1F4E5}"} Shartnomani yuklab olish (PDF)
                  </button>
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
                {[1, 4, 5].includes(step) && (
                  <button
                    onClick={goNext}
                    disabled={(step === 4 && !canSubmit) || (step === 5 && !contractScrolled)}
                    className="btn-primary py-2.5 px-6 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {step === 1 ? "Arizaga" : step === 4 ? "Shartnomani ko\u2019rish" : "Tasdiqlashga"} {"\u2192"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="text-center text-sm text-text-muted py-8 mt-10 border-t border-border">
        <p className="font-bold text-text-secondary mb-1">FathGroup</p>
        <p>Barcha raqamlar real API ma&apos;lumotlariga asoslangan.</p>
        <p className="mt-1 text-xs text-text-muted/50">{"\u00A9"} 2026</p>
      </footer>
    </div>
  );
}
