// Biznes konstantalari
export const CAMPAIGN_TARGET_UZS = Number(process.env.CAMPAIGN_TARGET_UZS) || 500_000_000;
export const USD_UZS_RATE = Number(process.env.USD_UZS_RATE) || 12_700;

// Foyda taqsimoti: 20% yaratuvchiga, 80% investorlarga
export const CREATOR_SHARE_PCT = 20;
export const INVESTOR_POOL_PCT = 80;

// Loyihalar ro'yxati va API endpointlari
export const PROJECTS = [
  {
    key: "copytrade",
    name: "CopyTrade",
    description: "Trading tajribasi yo'q foydalanuvchilarga professional strategiyalarni avtomatik nusxalash imkonini beradi.",
    url: "copytrade.uz",
    statsUrl: process.env.COPYTRADE_STATS_URL || "",
  },
  {
    key: "fath",
    name: "FATH Robot",
    description: "Murakkab savdo jarayonini AI asosida avtomatlashtirib, savdo intizomini oshiradi.",
    url: "fathrobot.uz",
    statsUrl: process.env.FATH_WEBSITE_STATS_URL || "",
  },
  {
    key: "pdf",
    name: "EPDF Services",
    description: "PDF, Word va boshqa hujjatlar bilan ishlashni bitta platformada birlashtiradi.",
    url: "epdf.uz",
    statsUrl: process.env.PDF_STATS_URL || "",
  },
  {
    key: "ticknote",
    name: "Ticknote",
    description: "Treyd tarixini tahlil qilib, xatolarni topish va strategiyani yaxshilashga yordam beradi.",
    url: "ticknote.uz",
    statsUrl: process.env.TICKNOTE_STATS_URL || "",
  },
] as const;
