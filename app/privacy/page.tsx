import Link from "next/link";

const sections = [
  {
    title: "What This Covers",
    body: "This Privacy Policy explains how Patchmap collects, uses, and protects information when you use the Patchmap website and product.",
  },
  {
    title: "Information We Collect",
    body: "We may collect account information, workspace information, pull request metadata, grouped review content, walkthrough notes, and other information you choose to store in Patchmap so the product can function.",
  },
  {
    title: "How We Use Information",
    body: "We use information to operate the service, authenticate users, store and display Patchmaps and walkthroughs, improve reliability and security, and support customer requests.",
  },
  {
    title: "Code And Review Content",
    body: "Patchmap is built to help teams organize pull requests and review context. Code snippets, diff content, file names, annotations, and walkthrough notes are used to provide the product experience you request.",
  },
  {
    title: "No Sale Of Data",
    body: "Patchmap does not sell personal information or customer content.",
  },
  {
    title: "AI And Model Training",
    body: "Patchmap does not provide your code, pull request content, annotations, or walkthrough data to AI providers for model training.",
  },
  {
    title: "When We Share Information",
    body: "We may share information only with service providers that help us operate Patchmap, such as hosting, authentication, storage, and infrastructure providers, or when required by law.",
  },
  {
    title: "Data Retention",
    body: "We retain information for as long as needed to operate the service, maintain account and workspace history, resolve disputes, and meet legal obligations.",
  },
  {
    title: "Security",
    body: "We use reasonable administrative, technical, and organizational measures to protect information, but no system can guarantee absolute security.",
  },
  {
    title: "Changes",
    body: "We may update this Privacy Policy from time to time. If we make material changes, we will update the page and effective date.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card px-6 py-6 md:px-7 md:py-7">
        <div className="pm-context-kicker">Public Policy</div>
        <h1 className="pm-hero-title mt-2">Privacy Policy</h1>
        <p className="pm-hero-subtitle pm-section-lead">
          Patchmap is designed to help teams review pull requests with more structure and context. This page explains how data is handled in the product.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--pm-text-soft)]">
          <span className="pm-pill">Effective March 16, 2026</span>
          <Link href="/" className="pm-button pm-button-secondary">
            Back to Home
          </Link>
        </div>
      </section>

      <section className="pm-page-stack mt-8">
        <article className="pm-emphasis-card">
          <div className="pm-step-chip">Key Commitments</div>
          <h2 className="pm-emphasis-title mt-3">What matters most</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="pm-soft-panel">
              <div className="pm-emphasis-title">No data sale</div>
              <p className="pm-emphasis-copy">Patchmap does not sell customer or personal data.</p>
            </div>
            <div className="pm-soft-panel">
              <div className="pm-emphasis-title">No AI training use</div>
              <p className="pm-emphasis-copy">Code, diffs, and walkthrough content are not given to AI providers for model training.</p>
            </div>
            <div className="pm-soft-panel">
              <div className="pm-emphasis-title">Product-only use</div>
              <p className="pm-emphasis-copy">Stored content is used to run Patchmap and support the workflows your team asks for.</p>
            </div>
          </div>
        </article>

        <article className="pm-card p-6 md:p-7">
          <div className="pm-card-header">
            <div>
              <h2 className="pm-card-title">Policy Details</h2>
              <p className="pm-card-subtitle">
                Plain-language details about what Patchmap collects and how it is used.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {sections.map((section) => (
              <section key={section.title} className="pm-soft-panel">
                <h3 className="pm-emphasis-title">{section.title}</h3>
                <p className="pm-emphasis-copy">{section.body}</p>
              </section>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
