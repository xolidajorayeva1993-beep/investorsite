import { db } from "./firebase-admin";

export type ProjectConfig = {
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

export type PlatformConfig = {
  campaignTargetUzs: number;
  projects: ProjectConfig[];
};

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  campaignTargetUzs: 500_000_000,
  projects: [
    {
      key: "copytrade",
      name: "CopyTrade",
      description: "Trading tajribasi yo'q foydalanuvchilarga professional strategiyalarni avtomatik nusxalash imkonini beradi.",
      url: "copytrade.uz",
      statsUrl: process.env.COPYTRADE_STATS_URL || "",
      apiDocsUrl: process.env.COPYTRADE_API_DOCS_URL || "",
      useEnvFallback: true,
      icon: "📊",
      gradient: "from-blue-500/10 to-indigo-500/10",
      tagline: "Trading bilmasdan — daromad qiling",
      problem: "Minglab odamlar forexga kirishni xohlaydi, lekin bilim va tajriba yetishmasligi sababli yo'qotadi.",
      solution: "CopyTrade professional treyderlar savdosini avtomatik nusxalaydi. Siz hech narsa qilmaysiz — foyda avtomatik tushadi.",
      audience: "Passiv daromad izlovchilar, forex boshlovchilar, vaqti cheklangan investorlar",
      model: "Obuna asosida (oylik/yillik). Har bir obunachi — barqaror daromad manbai.",
      order: 0,
      active: true,
    },
    {
      key: "fath",
      name: "FATH Robot",
      description: "Murakkab savdo jarayonini AI asosida avtomatlashtirib, savdo intizomini oshiradi.",
      url: "fathrobot.uz",
      statsUrl: process.env.FATH_WEBSITE_STATS_URL || "",
      apiDocsUrl: process.env.FATH_API_DOCS_URL || "",
      useEnvFallback: true,
      icon: "🤖",
      gradient: "from-purple-500/10 to-pink-500/10",
      tagline: "AI bilan savdo — xatosiz, emosiyasiz",
      problem: "Treyderlarning 90% emosional qarorlar qabul qilib, zarar ko'radi. Inson xato qiladi — robot qilmaydi.",
      solution: "FATH Robot sun'iy intellekt asosida bozorni 24/7 tahlil qiladi va buyurtmalarni avtomatik bajaradi.",
      audience: "Aktiv treyderlar, fond menejerlari, investitsiya guruhlari",
      model: "Litsenziya + obuna. Premium foydalanuvchilar barqaror daromad keltiradi.",
      order: 1,
      active: true,
    },
    {
      key: "pdf",
      name: "EPDF Services",
      description: "PDF, Word va boshqa hujjatlar bilan ishlashni bitta platformada birlashtiradi.",
      url: "epdf.uz",
      statsUrl: process.env.PDF_STATS_URL || "",
      apiDocsUrl: process.env.PDF_API_DOCS_URL || "",
      useEnvFallback: true,
      icon: "📄",
      gradient: "from-orange-500/10 to-amber-500/10",
      tagline: "Hujjatlar bilan ishlash — 10x tezroq",
      problem: "Har kuni millionlab odamlar PDF konvertatsiya, tahrir va tarjima qilishda vaqt yo'qotadi.",
      solution: "EPDF barcha hujjat operatsiyalarini bitta platformada — web va Telegram orqali hal qiladi. AI bilan aqlli qayta ishlash.",
      audience: "Talabalar, ofis xodimlari, bizneslar, davlat tashkilotlari",
      model: "Freemium + obuna. Keng auditoriya = tez o'sish potensiali.",
      order: 2,
      active: true,
    },
    {
      key: "ticknote",
      name: "Ticknote",
      description: "Treyd tarixini tahlil qilib, xatolarni topish va strategiyani yaxshilashga yordam beradi.",
      url: "ticknote.uz",
      statsUrl: process.env.TICKNOTE_STATS_URL || "",
      apiDocsUrl: process.env.TICKNOTE_API_DOCS_URL || "",
      useEnvFallback: true,
      icon: "📈",
      gradient: "from-green-500/10 to-emerald-500/10",
      tagline: "Savdolaringizni AI tahlil qilsin",
      problem: "Ko'pchilik treyderlar tartibsizlik, xatolarni bilmaslik va emosional savdo tufayli pul yo'qotadi.",
      solution: "TickNote har bir savdoni avtomatik yozadi, AI tahlil qiladi va aniq qarorlar qabul qilishga yordam beradi.",
      audience: "Barcha darajadagi treyderlar, trading kurslar, investitsiya klublari",
      model: "Obuna + in-app xaridlar. Foydalanuvchi qanchalik ko'p trade qilsa — shunchalik foydali.",
      order: 3,
      active: true,
    },
  ],
};

export async function readPlatformConfig(): Promise<PlatformConfig> {
  try {
    const snap = await db.collection("config").doc("platform").get();
    if (snap.exists) {
      const parsed = snap.data() as Partial<PlatformConfig>;
      const envStatsByKey: Record<string, string> = {
        copytrade: process.env.COPYTRADE_STATS_URL || "",
        fath: process.env.FATH_WEBSITE_STATS_URL || "",
        pdf: process.env.PDF_STATS_URL || "",
        ticknote: process.env.TICKNOTE_STATS_URL || "",
      };

      const normalizedProjects =
        Array.isArray(parsed.projects) && parsed.projects.length > 0
          ? [...parsed.projects]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((p) => ({
                ...p,
                useEnvFallback: p.useEnvFallback !== false,
                statsUrl:
                  p.statsUrl ||
                  (p.useEnvFallback !== false ? envStatsByKey[p.key] || "" : ""),
              }))
          : DEFAULT_PLATFORM_CONFIG.projects;

      return {
        campaignTargetUzs:
          Number(parsed.campaignTargetUzs) > 0
            ? Number(parsed.campaignTargetUzs)
            : DEFAULT_PLATFORM_CONFIG.campaignTargetUzs,
        projects: normalizedProjects,
      };
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_PLATFORM_CONFIG;
}

export async function writePlatformConfig(config: PlatformConfig): Promise<void> {
  await db.collection("config").doc("platform").set({
    ...config,
    _updatedAt: new Date().toISOString(),
  });
}

/** Slugify loyiha nomidan key generatsiya qilish */
export function generateProjectKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}
