// Loyiha holatlari
export type ProjectState = "online" | "degraded" | "offline";

// Har bir loyixa API'dan keladigan real ma'lumotlar
export type ProjectStats = {
  state: ProjectState;
  monthlyRevenueUsd: number;
  activePayingClients: number;
  newClients30d: number;
  syncEventsToday: number;
  lastSync: string;
  source: string;
  totalUsers: number;
  freeUsers: number;
  paidUsers: number;
};

// Sayt ichida ko'rsatiladigan loyixa kartasi
export type ProjectCard = {
  key: string;
  name: string;
  description: string;
  url: string;
  // Taqdimot maydonlari (platform_config.json dan)
  apiDocsUrl?: string;
  icon: string;
  gradient: string;
  tagline: string;
  problem: string;
  solution: string;
  audience: string;
  model: string;
  stats: ProjectStats | null; // null = API javob bermagan
  error?: string;
};

// Aggregator javob formati
export type AggregatedStats = {
  projects: ProjectCard[];
  totals: {
    monthlyRevenueUsd: number;
    monthlyRevenueUzs: number;
    activePayingClients: number;
    newClients30d: number;
    onlineProjects: number;
  };
  fetchedAt: string;
};

// Firestore: investor ariza
export type InvestorApplication = {
  id: string;
  fullName: string;
  passportSeries: string;
  passportNumber: string;
  phone: string;
  email: string;
  address: string;
  investmentAmountUzs: number;
  consentAccepted: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

// Firestore: tasdiqlangan investor
export type Investor = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  investedUzs: number;
  status: "active" | "frozen" | "exited";
  joinedAt: string;
};

// Fundraising holati (real Firestore ma'lumotlaridan)
export type FundraisingStatus = {
  targetCapitalUzs: number;
  currentCapitalUzs: number;
  remainingCapitalUzs: number;
  investorCount: number;
  acceptingInvestors: boolean;
  progressPct: number;
};

// Investor uchun daromad hisob-kitobi
export type ProfitCalculation = {
  investmentUzs: number;
  /** Investor ulushi jami investitsiyalar ichida (0-100) */
  poolSharePct: number;
  /** Investorning umumiy daromaddagi haqiqiy ulushi (pool_share × 0.80) */
  effectiveSharePct: number;
  monthlyNetRevenueUzs: number;
  monthlyProfitUzs: number;
  yearlyProfitUzs: number;
  totalCurrentCapitalUzs: number;
  creatorSharePct: number;
  investorPoolPct: number;
};
