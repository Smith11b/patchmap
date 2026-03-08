import Link from "next/link";
import { BrandLockup } from "@/app/components/brand-lockup";

const quickActions = [
  {
    title: "Register Pull Request",
    description: "Paste any GitHub PR or GitLab MR URL to ingest files and load grouped views.",
    href: "/register",
    cta: "Open Register",
  },
  {
    title: "Sign In",
    description: "Authenticate with Supabase OTP to access workspace-linked PatchMap data.",
    href: "/login",
    cta: "Open Login",
  },
  {
    title: "Developer Test Console",
    description: "Use internal API smoke workflows for registration, lookup, and markdown checks.",
    href: "/test",
    cta: "Open Test Page",
  },
];

export default function Home() {
  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-6 py-8 md:px-8 md:py-10">
        <BrandLockup subtitle="Enterprise Review Workspace" />
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          <span className="pm-pill">PatchMap</span>
          <span className="pm-pill">Grouped PR Intelligence</span>
        </div>
        <h1 className="pm-hero-title mt-4">Code review context, organized for humans.</h1>
        <p className="pm-hero-subtitle">
          PatchMap turns pull request diffs into grouped walkthroughs with focused context, helping reviewers
          understand intent before they parse every hunk.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pm-button pm-button-primary" href="/register">
            Start With PR URL
          </Link>
          <Link className="pm-button pm-button-secondary" href="/login">
            Sign In
          </Link>
        </div>
      </section>

      <section className="pm-fade-stagger mt-6 grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <article key={action.href} className="pm-card p-5">
            <h2 className="pm-card-title">{action.title}</h2>
            <p className="pm-card-subtitle">{action.description}</p>
            <div className="mt-4">
              <Link className="pm-button pm-button-secondary w-full" href={action.href}>
                {action.cta}
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
