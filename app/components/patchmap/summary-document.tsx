"use client";

import { PatchMapSummary } from "@/lib/patchmap/ui-types";

type SummaryDocumentProps = {
  summary: PatchMapSummary;
};

const sections = [
  { key: "purpose", label: "Purpose" },
  { key: "behaviorChangeNotes", label: "Behavior Changes" },
  { key: "riskNotes", label: "Risk Notes" },
  { key: "testNotes", label: "Test Notes" },
  { key: "demoNotes", label: "Demo Notes" },
] as const;

export function SummaryDocument({ summary }: SummaryDocumentProps) {
  if (!summary) {
    return (
      <article className="pm-card p-6 md:p-7">
        <h2 className="pm-card-title">Review Summary</h2>
        <p className="pm-card-subtitle mt-3">
          No written review summary has been added yet.
        </p>
      </article>
    );
  }

  return (
    <article className="pm-card p-6 md:p-7">
      <div className="pm-card-header">
        <div>
          <h2 className="pm-card-title">Review Summary</h2>
          <p className="pm-card-subtitle">
            Read this first, then decide whether to start the grouped review or the walkthrough.
          </p>
        </div>
        <span className="pm-pill">
          Demoable: {summary.demoable === null || summary.demoable === undefined ? "Not set" : summary.demoable ? "Yes" : "No"}
        </span>
      </div>

      <div className="pm-soft-stack">
        {sections.map((section) => {
          const value = summary[section.key];
          if (!value) {
            return null;
          }

          return (
            <section key={section.key} className="pm-soft-panel">
              <div className="pm-context-kicker">{section.label}</div>
              <div className="mt-3 whitespace-pre-wrap text-[0.98rem] leading-7 text-[var(--pm-text)]">
                {value}
              </div>
            </section>
          );
        })}

        {summary.generatedMarkdown ? (
          <section className="pm-soft-panel">
            <div className="pm-context-kicker">PR Markdown</div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--pm-border)] bg-[var(--pm-bg-soft)] p-4 text-sm leading-6 text-[var(--pm-text)]">
              {summary.generatedMarkdown}
            </pre>
          </section>
        ) : null}
      </div>
    </article>
  );
}
