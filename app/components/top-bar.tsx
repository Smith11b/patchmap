"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/app/components/theme-toggle";

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
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/privacy";

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
            <>
              {pathname !== "/" ? (
                <Link href="/" className="pm-topbar-link">
                  Home
                </Link>
              ) : null}
              {pathname !== "/privacy" ? (
                <Link href="/privacy" className="pm-topbar-link">
                  Privacy
                </Link>
              ) : null}
              {pathname !== "/login" ? (
                <Link href="/login" className="pm-button pm-button-secondary pm-topbar-cta">
                  Sign In
                </Link>
              ) : null}
              <ThemeToggle />
            </>
          ) : (
            <>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`pm-topbar-link ${isActive(pathname, item.href) ? "pm-topbar-link-active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
              <ThemeToggle />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
