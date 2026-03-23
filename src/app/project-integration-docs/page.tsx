import Link from "next/link";

const requiredFields = [
  "name",
  "url",
  "statsUrl",
  "description",
  "tagline",
  "active",
];

const recommendedFields = [
  "apiDocsUrl",
  "icon",
  "gradient",
  "problem",
  "solution",
  "audience",
  "model",
  "order",
];

const onboardingSteps = [
  "Yangi loyiha ichida public stats endpoint yarating.",
  "Endpoint brauzerda authsiz ochilishini tekshiring.",
  "JSON javob formatini standartga mos qiling.",
  "Endpoint uchun qisqa dokumentatsiya sahifasi tayyorlang.",
  "Admin panelda yangi loyiha yarating va barcha maydonlarni kiriting.",
  "Bosh sahifada loyiha Live holatda chiqayotganini tekshiring.",
  "Investor dashboard va portfolio bo'limida raqamlar ko'rinishini tekshiring.",
];

const troubleshooting = [
  {
    problem: "Loyiha Offline yoki API ulanmagan chiqyapti",
    reason: "statsUrl noto'g'ri, endpoint ishlamayapti yoki JSON format xato",
    action: "Brauzerda statsUrl ni ochib tekshiring, 200 qaytayotganini va JSON ichida barcha maydon borligini tasdiqlang.",
  },
  {
    problem: "Userlar soni 0 bo'lib qolyapti",
    reason: "totalUsers, freeUsers, paidUsers son emas yoki umuman qaytmayapti",
    action: "Bu maydonlarni number formatda qaytaring. String, null yoki matn yubormang.",
  },
  {
    problem: "Revenue hisoblanmayapti",
    reason: "monthlyRevenueUsd maydoni xato yoki number emas",
    action: "Revenue ni USD ko'rinishida number qilib yuboring. Masalan 1250.5.",
  },
  {
    problem: "Loyiha saqlandi, lekin Live bo'lmadi",
    reason: "Endpoint auth talab qilmoqda yoki server tashqaridan ochiq emas",
    action: "statsUrl public bo'lsin. Login talab qilmasin. Tashqi domain orqali ochilsin.",
  },
];

const exampleJson = `{
  "success": true,
  "data": {
    "state": "online",
    "monthlyRevenueUsd": 1200,
    "activePayingClients": 85,
    "newClients30d": 22,
    "syncEventsToday": 14,
    "lastSync": "2026-03-24T10:20:30.000Z",
    "source": "my-project-api",
    "totalUsers": 540,
    "freeUsers": 455,
    "paidUsers": 85
  }
}`;

const nextExample = `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      state: "online",
      monthlyRevenueUsd: 1200,
      activePayingClients: 85,
      newClients30d: 22,
      syncEventsToday: 14,
      lastSync: new Date().toISOString(),
      source: "my-project-api",
      totalUsers: 540,
      freeUsers: 455,
      paidUsers: 85,
    },
  });
}`;

const fastApiExample = `from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/api/investor", tags=["investor"])

@router.get("/stats")
async def investor_stats():
    return {
        "success": True,
        "data": {
            "state": "online",
            "monthlyRevenueUsd": 1200,
            "activePayingClients": 85,
            "newClients30d": 22,
            "syncEventsToday": 14,
            "lastSync": datetime.now(timezone.utc).isoformat(),
            "source": "my-project-api",
            "totalUsers": 540,
            "freeUsers": 455,
            "paidUsers": 85,
        }
    }`;

export default function ProjectIntegrationDocsPage() {
  return (
    <div className="shell pt-4 pb-10">
      <header className="top-nav mt-2">
        <div className="brand"><span className="brand-dot" /> FathGroup Docs</div>
        <nav className="flex items-center gap-1 flex-wrap">
          <Link href="/" className="nav-link">Bosh sahifa</Link>
          <Link href="/admin" className="nav-link">Admin</Link>
        </nav>
      </header>

      <section className="mt-12 max-w-4xl">
        <span className="badge badge-section">Integratsiya qo'llanmasi</span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-4">
          Yangi loyihani FathGroup portfeliga ulash bo'yicha to'liq dokumentatsiya
        </h1>
        <p className="text-text-secondary mt-3 text-lg leading-relaxed">
          Bu hujjat yangi loyiha yaratishda sizning asosiy ishchi qo'llanmangiz bo'ladi.
          Loyihani to'g'ri ulash uchun nima majburiy, qanday API kerak, admin panelga nima kiritiladi,
          va xatolarni qanday tekshirish kerakligi shu yerda to'liq yozilgan.
        </p>
      </section>

      <div className="divider" />

      <section className="grid gap-6">
        <div className="card-elevated">
          <h2 className="text-xl font-bold mb-3">1. Tizim yangi loyihadan nimani kutadi</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Investorsite yangi loyihani oddiy web sahifa sifatida emas, statistika bera oladigan biznes modul sifatida ko'radi.
            Shuning uchun loyiha ulanishi uchun eng muhim narsa bu public stats API hisoblanadi.
          </p>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="card">
              <div className="font-bold mb-1">Majburiy</div>
              <p className="text-sm text-text-secondary">Public ishlaydigan stats endpoint bo'lishi shart.</p>
            </div>
            <div className="card">
              <div className="font-bold mb-1">Majburiy</div>
              <p className="text-sm text-text-secondary">Admin panelda loyiha taqdimot maydonlari to'liq to'ldirilishi kerak.</p>
            </div>
            <div className="card">
              <div className="font-bold mb-1">Majburiy</div>
              <p className="text-sm text-text-secondary">Stats endpoint login talab qilmasligi va tashqaridan ochilishi kerak.</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-elevated">
            <h2 className="text-xl font-bold mb-3">2. Admin paneldagi majburiy maydonlar</h2>
            <div className="space-y-2 text-sm">
              {requiredFields.map((field) => (
                <div key={field} className="p-2 rounded-lg bg-bg border border-border">{field}</div>
              ))}
            </div>
          </div>

          <div className="card-elevated">
            <h2 className="text-xl font-bold mb-3">3. Tavsiya etiladigan maydonlar</h2>
            <div className="space-y-2 text-sm">
              {recommendedFields.map((field) => (
                <div key={field} className="p-2 rounded-lg bg-bg border border-border">{field}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-elevated">
          <h2 className="text-xl font-bold mb-3">4. Stats API contract</h2>
          <p className="text-sm text-text-secondary mb-4">
            Endpoint JSON javobi quyidagi struktura bilan qaytishi kerak. `success` bo'lmasa yoki `data` bo'lmasa,
            loyiha statistikasi o'qilmaydi.
          </p>
          <pre className="text-xs overflow-auto bg-surface border border-border-light rounded-lg p-4">{exampleJson}</pre>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-elevated">
            <h2 className="text-xl font-bold mb-3">5. Har bir field nimani anglatadi</h2>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><strong className="text-text">state:</strong> `online`, `degraded`, yoki `offline`. Odatda ishlayotgan API uchun `online` yuboriladi.</p>
              <p><strong className="text-text">monthlyRevenueUsd:</strong> Loyihaning oylik daromadi, USD formatda number bo'lishi kerak.</p>
              <p><strong className="text-text">activePayingClients:</strong> Hozir to'layotgan aktiv mijozlar soni.</p>
              <p><strong className="text-text">newClients30d:</strong> Oxirgi 30 kundagi yangi pullik yoki aktiv klientlar soni.</p>
              <p><strong className="text-text">syncEventsToday:</strong> Bugungi sync yoki muhim eventlar soni.</p>
              <p><strong className="text-text">lastSync:</strong> Oxirgi yangilanish sanasi, ISO formatda bo'lishi kerak.</p>
              <p><strong className="text-text">source:</strong> Ma'lumot qayerdan kelayotganini bildiruvchi matn.</p>
              <p><strong className="text-text">totalUsers / freeUsers / paidUsers:</strong> Foydalanuvchilar statistikasi.</p>
            </div>
          </div>

          <div className="card-elevated">
            <h2 className="text-xl font-bold mb-3">6. Endpoint uchun majburiy talablar</h2>
            <div className="space-y-3 text-sm text-text-secondary">
              <p>Endpoint internetdan ochilishi kerak.</p>
              <p>Auth yoki token talab qilmasligi kerak.</p>
              <p>HTTP 200 qaytarishi kerak.</p>
              <p>JSON valid bo'lishi kerak.</p>
              <p>Number maydonlar string bo'lmasligi kerak.</p>
              <p>8 soniyadan uzoq javob bermasligi kerak, aks holda timeout bo'lishi mumkin.</p>
              <p>SSL sertifikat normal ishlashi kerak.</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-elevated">
            <h2 className="text-xl font-bold mb-3">7. Next.js loyiha uchun tayyor namuna</h2>
            <p className="text-sm text-text-secondary mb-4">
              Agar yangi loyiha ham Next.js bo'lsa, quyidagi route bilan boshlashingiz mumkin.
            </p>
            <pre className="text-xs overflow-auto bg-surface border border-border-light rounded-lg p-4">{nextExample}</pre>
          </div>

          <div className="card-elevated">
            <h2 className="text-xl font-bold mb-3">8. FastAPI loyiha uchun tayyor namuna</h2>
            <p className="text-sm text-text-secondary mb-4">
              Agar loyiha backend'i FastAPI bo'lsa, quyidagi endpoint yetarli boshlang'ich namunadir.
            </p>
            <pre className="text-xs overflow-auto bg-surface border border-border-light rounded-lg p-4">{fastApiExample}</pre>
          </div>
        </div>

        <div className="card-elevated">
          <h2 className="text-xl font-bold mb-3">9. Loyihani ulash tartibi: qadamma-qadam</h2>
          <div className="space-y-2">
            {onboardingSteps.map((step, index) => (
              <div key={step} className="flex gap-3 items-start p-3 rounded-xl bg-bg border border-border">
                <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="text-sm text-text-secondary">{step}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated">
          <h2 className="text-xl font-bold mb-3">10. Admin panelga kiritishda checklist</h2>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>1. Loyiha nomi aniq kiritildi.</p>
            <p>2. Asosiy domen to'g'ri kiritildi.</p>
            <p>3. Stats API URL alohida endpoint sifatida kiritildi.</p>
            <p>4. API dokumentatsiya URL kiritildi.</p>
            <p>5. Icon va gradient UI uchun moslandi.</p>
            <p>6. Description, tagline, problem, solution to'ldirildi.</p>
            <p>7. Audience va model to'ldirildi.</p>
            <p>8. Loyiha `Faol` holatda saqlandi.</p>
          </div>
        </div>

        <div className="card-elevated">
          <h2 className="text-xl font-bold mb-3">11. Eng ko'p uchraydigan xatolar</h2>
          <div className="space-y-3">
            {troubleshooting.map((item) => (
              <div key={item.problem} className="p-4 rounded-xl border border-border bg-bg">
                <div className="font-bold text-sm mb-1">{item.problem}</div>
                <p className="text-sm text-text-secondary"><strong className="text-text">Sabab:</strong> {item.reason}</p>
                <p className="text-sm text-text-secondary mt-1"><strong className="text-text">Yechim:</strong> {item.action}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated">
          <h2 className="text-xl font-bold mb-3">12. Qisqa xulosa</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Yangi loyiha ulashning markaziy nuqtasi bu public stats endpoint. Agar loyiha endpointi to'g'ri ishlasa,
            admin panelda ma'lumotlar to'g'ri to'ldirilsa va dokumentatsiya linki mavjud bo'lsa, loyiha portfelga muammosiz ulanadi.
            Shuning uchun har bir yangi loyiha yaratishda shu hujjat bo'yicha ketma-ket ishlang.
          </p>
        </div>
      </section>
    </div>
  );
}