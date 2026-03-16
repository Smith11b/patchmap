import Link from "next/link";

const featurePoints = [
  {
    title: "Group files into review sections",
    description: "Organize changes into logical areas like API, service, repository, and UI.",
  },
  {
    title: "Add human context",
    description: "Write section summaries and file annotations that explain intent, scope, and risk.",
  },
  {
    title: "Guide reviewers through the change",
    description: "Order files deliberately so reviews follow the path the author intended.",
  },
  {
    title: "Clarify technical and product impact",
    description: "Help engineering, PM, and QA understand how a large PR fits together.",
  },
];

export default function Home() {
  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-landing-hero pm-card px-5 py-6 md:px-8 md:py-8">
        <div className="pm-context-kicker">Developer review workflows</div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          <span className="pm-pill">Patchmap</span>
          <span className="pm-pill">Algorithmic PR structuring</span>
        </div>
        <h1 className="pm-hero-title mt-3 pm-landing-title">Understand large PRs faster.</h1>
        <p className="pm-hero-subtitle pm-landing-subtitle">
          Patchmap helps authors turn complex pull requests into guided walkthroughs by grouping files,
          adding human-written context, annotating changes, and ordering the review intentionally.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pm-button pm-button-primary" href="/login">
            Sign In
          </Link>
        </div>
      </section>

      <section className="pm-fade-stagger mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {featurePoints.map((feature) => (
          <article key={feature.title} className="pm-card p-5">
            <div className="pm-context-kicker">Core capability</div>
            <h2 className="pm-card-title mt-2">{feature.title}</h2>
            <p className="pm-card-subtitle">{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="pm-fade-stagger mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="pm-card p-5 md:p-6">
          <div className="pm-context-kicker">Built for complex reviews</div>
          <h2 className="pm-card-title mt-2 text-[1.25rem]">Built for teams reviewing complex PRs.</h2>
          <p className="pm-card-subtitle mt-3">
            Patchmap gives reviewers a clearer path through large changesets without changing how teams write
            code or open pull requests. It is designed for engineering teams that need more structure in the
            review itself, especially when multiple layers of the system are changing at once.
          </p>
        </article>

        <article className="pm-card p-5 md:p-6">
          <div className="pm-context-kicker">What it improves</div>
          <div className="mt-3 grid gap-3">
            <div className="pm-landing-stat">
              <div className="pm-landing-stat-label">Review flow</div>
              <p className="pm-card-subtitle">Make large changes easier to follow from entry point to implementation detail.</p>
            </div>
            <div className="pm-landing-stat">
              <div className="pm-landing-stat-label">Shared understanding</div>
              <p className="pm-card-subtitle">Keep engineering, PM, and QA aligned on what changed and why.</p>
            </div>
          </div>
        </article>
      </section>

      <footer className="pm-landing-footer">
        <div>Patchmap</div>
        <div>Structured pull request walkthroughs for software teams.</div>
        <Link href="/login" className="pm-topbar-link">
          Sign In
        </Link>
      </footer>
    </main>
  );
}
