import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="shell py-10">
      <div className="max-w-3xl mx-auto card-elevated">
        <h1 className="text-3xl font-bold tracking-tight">Terms &amp; Conditions</h1>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">
          Ushbu sahifa umumiy foydalanish shartlarini bildiradi. Yakuniy huquqiy matnni
          admin panel orqali kiritilgan havola orqali yangilang.
        </p>

        <div className="mt-6 space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            1. Platformadan foydalanish foydalanuvchi roziligi asosida amalga oshiriladi.
          </p>
          <p>
            2. Investitsiya bilan bog&apos;liq barcha qarorlar foydalanuvchining mustaqil
            qarori hisoblanadi.
          </p>
          <p>
            3. To&apos;liq huquqiy shartlar e&apos;lon qilinganda ushbu sahifa yangilanadi.
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
