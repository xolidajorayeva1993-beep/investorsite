import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="shell py-10">
      <div className="max-w-3xl mx-auto card-elevated">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">
          Ushbu sahifa maxfiylik siyosati uchun vaqtinchalik sahifa hisoblanadi. Admin panel
          orqali `Privacy` havolasini xohlagan URL&apos;ga almashtirishingiz mumkin.
        </p>

        <div className="mt-6 space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            1. Foydalanuvchi ma&apos;lumotlari faqat xizmatni taqdim etish uchun ishlatiladi.
          </p>
          <p>
            2. Shaxsiy ma&apos;lumotlar uchinchi tomonga foydalanuvchi roziligisiz berilmaydi.
          </p>
          <p>
            3. Maxfiylik qoidalari yangilanganda ushbu sahifa yangilanadi.
          </p>
        </div>

        <div className="mt-8">
          <Link href="/" className="btn-secondary">
            Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    </main>
  );
}
