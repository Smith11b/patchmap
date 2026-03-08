import Image from "next/image";
import Link from "next/link";

type BrandLockupProps = {
  subtitle?: string;
  className?: string;
};

export function BrandLockup({ subtitle, className }: BrandLockupProps) {
  return (
    <div className={className}>
      <Link className="inline-flex items-center" href="/" aria-label="PatchMap Home">
        <Image
          src="/logo.png"
          alt="PatchMap"
          width={260}
          height={78}
          priority
          className="h-auto w-[180px] md:w-[220px]"
        />
      </Link>
      {subtitle ? <p className="mt-2 text-sm text-[var(--pm-text-soft)]">{subtitle}</p> : null}
    </div>
  );
}
