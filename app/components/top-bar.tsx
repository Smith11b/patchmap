"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/register", label: "Register" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopBar() {
  const pathname = usePathname() ?? "/";
  const isPublicRoute = pathname === "/" || pathname === "/login";

  return (
    <header className="pm-topbar">
      <div className="pm-topbar-inner">
        <Link className="pm-topbar-brand" href="/" aria-label="PatchMap Home">
          <Image
            src="/logo-tight.png"
            alt="PatchMap"
            width={174}
            height={54}
            priority
            unoptimized
            className="pm-topbar-logo"
          />
        </Link>

        <nav className="pm-topbar-nav" aria-label="Primary">
          {isPublicRoute ? (
            pathname === "/login" ? (
              <Link href="/" className="pm-topbar-link">
                Home
              </Link>
            ) : (
              <Link href="/login" className="pm-button pm-button-secondary pm-topbar-cta">
                Sign In
              </Link>
            )
          ) : (
            navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`pm-topbar-link ${isActive(pathname, item.href) ? "pm-topbar-link-active" : ""}`}
              >
                {item.label}
              </Link>
            ))
          )}
        </nav>
      </div>
    </header>
  );
}
