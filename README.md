# Investorsite

4 ta ishlaydigan raqamli loyiha (CopyTrade, FATH Robot, EPDF, Ticknote) uchun investor jalb qilish va boshqarish platformasi.

## O'rnatish

```bash
npm install
```

## .env.local sozlash

Firebase service account va API endpointlarini `.env.local` faylida to'ldiring.

## Ishga tushirish

```bash
npm run dev
```

## Sahifalar

- `/` — Asosiy sahifa: 4 loyiha prezentatsiyasi, kalkulyator, qoidalar
- `/become-investor` — Investor ariza topshirish (4 qadamli wizard)
- `/dashboard` — Investor shaxsiy kabineti (tez orada)

## API Endpoints

- `GET /api/hub/stats` — 4 ta loyihadan real statistika + Firestore investorlar
- `POST /api/investor/apply` — Investor ariza topshirish

## Formula

```
Investor ulushi = Uning puli ÷ Jami investitsiya × 100%
Investor foydasi = Oylik daromad × Investor ulushi
500 mln yig'ilgach → qabul to'xtatiladi
```
