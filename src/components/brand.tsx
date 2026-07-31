import logoAsset from "@/assets/logo-jd.png.asset.json";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "Instituto J&D Especialistas na Carreira Judiciária";
export const BRAND_SHORT = "Instituto J&D";
export const PORTAL_NAME = "Portal do Aluno – Instituto J&D Especialistas na Carreira Judiciária";
export const LOGO_URL = logoAsset.url;

export function BrandLogo({
  className,
  size = 36,
  alt = BRAND_NAME,
}: {
  className?: string;
  size?: number;
  alt?: string;
}) {
  return (
    <img
      src={LOGO_URL}
      alt={alt}
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function BrandLockup({
  className,
  subtitle = "Portal do Aluno",
  size = 36,
  invert = false,
}: {
  className?: string;
  subtitle?: string;
  size?: number;
  invert?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandLogo size={size} className="rounded-md bg-white p-0.5" />
      <div className="min-w-0 leading-tight">
        <div className={cn("truncate text-sm font-semibold tracking-tight", invert && "text-sidebar-foreground")}>
          {BRAND_SHORT}
        </div>
        <div
          className={cn(
            "truncate text-[11px] text-muted-foreground",
            invert && "text-sidebar-foreground/70",
          )}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
