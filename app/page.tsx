import Link from "next/link";

const demoScenes = [
  {
    title: "Import a PR",
    description: "Paste a PR URL, choose the workspace, and pull the files into Patchmap.",
    frameClass: "pm-demo-import",
  },
  {
    title: "Annotate Diffs",
    description: "Add context while the changed file stays visible in front of you.",
    frameClass: "pm-demo-annotate",
  },
  {
    title: "Create a Walkthrough",
    description: "Turn large changes into an ordered sequence with review notes for each step.",
    frameClass: "pm-demo-walkthrough",
  },
  {
    title: "Review Quickly",
    description: "Move through the guided path without hunting around the PR manually.",
    frameClass: "pm-demo-review",
  },
];

export default function Home() {
  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-landing-hero pm-card px-6 py-7 md:px-9 md:py-10">
        <div className="pm-context-kicker">Developer review workflows</div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          <span className="pm-pill">Patchmap</span>
          <span className="pm-pill">Algorithmic PR structuring</span>
        </div>
        <h1 className="pm-hero-title mt-3 pm-landing-title">Understand large PRs faster.</h1>
        <p className="pm-hero-subtitle pm-landing-subtitle pm-section-lead">
          Patchmap helps authors turn complex pull requests into guided walkthroughs by grouping files,
          adding human-written context, annotating changes, and ordering the review intentionally.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pm-button pm-button-primary" href="/login">
            Sign In
          </Link>
        </div>
      </section>

      <section className="pm-fade-stagger mt-8">
        <article className="pm-card p-6 md:p-7">
          <div className="pm-card-header">
            <div>
              <div className="pm-context-kicker">See The Flow</div>
              <h2 className="pm-card-title mt-2 text-[1.2rem]">A smoother way to move from PR to confident review.</h2>
              <p className="pm-card-subtitle pm-section-lead">
                Import the change, shape the story, and guide reviewers through it without turning the review process into extra work.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {demoScenes.map((scene) => (
              <article key={scene.title} className="pm-soft-panel">
                <div className={`pm-demo-frame ${scene.frameClass}`}>
                  <span className="pm-demo-glow" />
                  <span className="pm-demo-toolbar" />
                  <span className="pm-demo-panel pm-demo-panel-a" />
                  <span className="pm-demo-panel pm-demo-panel-b" />
                  <span className="pm-demo-panel pm-demo-panel-c" />
                  <span className="pm-demo-cursor" />
                </div>
                <h3 className="pm-card-title mt-4">{scene.title}</h3>
                <p className="pm-card-subtitle">{scene.description}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="pm-fade-stagger mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="pm-card p-6 md:p-7">
          <div className="pm-context-kicker">Built for complex reviews</div>
          <h2 className="pm-card-title mt-2 text-[1.25rem]">Built for teams reviewing complex PRs.</h2>
          <p className="pm-card-subtitle mt-4 pm-section-lead">
            Patchmap gives reviewers a clearer path through large changesets without changing how teams write
            code or open pull requests. It is designed for engineering teams that need more structure in the
            review itself, especially when multiple layers of the system are changing at once.
          </p>
        </article>

        <article className="pm-card p-6 md:p-7">
          <div className="pm-context-kicker">What it improves</div>
          <div className="mt-4 grid gap-4">
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
