import Image from "next/image";
import Link from "next/link";

type BrandLockupProps = {
  subtitle?: string;
  className?: string;
};

export function BrandLockup({ subtitle, className }: BrandLockupProps) {
  return (
    <div className={className}>
      <Link className="pm-brand-link" href="/" aria-label="PatchMap Home">
        <Image
          src="/logo.png"
          alt="PatchMap"
          width={220}
          height={66}
          priority
          className="pm-brand-logo"
        />
      </Link>
      {subtitle ? <p className="pm-brand-subtitle">{subtitle}</p> : null}
    </div>
  );
}
