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
    <div className={`brand ${className}`.trim()}>
      <span className={`brand-mark ${markClassName}`.trim()} aria-hidden="true">
        <svg viewBox="0 0 28 28" className="brand-mark-svg" role="img">
          <defs>
            <linearGradient id="fg-brand-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0A84FF" />
              <stop offset="100%" stopColor="#34C759" />
            </linearGradient>
          </defs>
          <rect x="1.5" y="1.5" width="25" height="25" rx="8" fill="url(#fg-brand-gradient)" />
          <path d="M8 8h12v3H11v4h7v3h-7v6H8V8z" fill="#fff" />
          <path d="M20 8l-6.2 16h3.2L23 8h-3z" fill="rgba(255,255,255,0.82)" />
        </svg>
      </span>
      <span className={`brand-text ${textClassName}`.trim()}>{label}</span>
    </div>
  );
}
