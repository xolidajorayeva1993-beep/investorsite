import Link from "next/link";

type BrandLogoProps = {
  label?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export default function BrandLogo({
  label = "FathGroup",
  className = "",
  markClassName = "",
  textClassName = "",
}: BrandLogoProps) {
  return (
    <Link href="/" aria-label="Bosh sahifaga qaytish" className={`brand ${className}`.trim()}>
      <span className={`brand-mark ${markClassName}`.trim()} aria-hidden="true">
        <svg viewBox="0 0 64 64" className="brand-mark-svg" role="img">
          <defs>
            <linearGradient id="fg-brand-gradient" x1="8" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0A84FF" />
              <stop offset="55%" stopColor="#2D7CF6" />
              <stop offset="100%" stopColor="#00B894" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#fg-brand-gradient)" />
          <circle cx="32" cy="32" r="19" fill="rgba(255,255,255,0.16)" />
          <path d="M18 40h6v8h-6zM29 33h6v15h-6zM40 25h6v23h-6z" fill="#ffffff" />
          <path d="M18 24l8-6 8 5 10-8" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M41 14h8v8" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </span>
      <span className={`brand-text ${textClassName}`.trim()}>{label}</span>
    </Link>
  );
}
