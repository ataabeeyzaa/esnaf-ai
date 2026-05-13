type Props = {
  size?: number;
  className?: string;
};

/**
 * Çırak brand mark — robot illustration that reads as the letter Ç,
 * placed inside a rounded emerald square so it stays legible across
 * light or dark backgrounds. Served as a transparent PNG from /public.
 */
export default function Logo({ size = 40, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/cirak-logo.png"
      alt="Çırak"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", width: size, height: size, objectFit: "contain" }}
    />
  );
}


/**
 * Compact wordmark with optional icon. Useful in headers next to navigation.
 */
export function LogoWithName({ size = 32, className }: Props) {
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Logo size={size} />
      <span className="font-bold tracking-tight text-slate-900">
        Çırak<span className="text-emerald-600">.</span>
      </span>
    </div>
  );
}
