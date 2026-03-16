"use client";

import { LookupFile, PatchMapWalkthroughStep, WalkthroughStepDraft } from "@/lib/patchmap/ui-types";

type WalkthroughStepListProps = {
  steps: Array<PatchMapWalkthroughStep | WalkthroughStepDraft>;
  fileMap: Map<string, LookupFile>;
  activeIndex: number;
  onSelect: (index: number) => void;
  emptyMessage?: string;
};

export function WalkthroughStepList({
  steps,
  fileMap,
  activeIndex,
  onSelect,
  emptyMessage = "No steps yet.",
}: WalkthroughStepListProps) {
  if (steps.length === 0) {
    return <div className="text-xs text-[var(--pm-text-soft)]">{emptyMessage}</div>;
  }

  return (
    <div className="mt-3 grid gap-2">
      {steps.map((step, index) => {
        const file = fileMap.get(step.prFileId);
        const isActive = index === activeIndex;
        return (
          <button
            key={"id" in step ? step.id : `${step.prFileId}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            className={`min-w-0 rounded-lg border px-3 py-3 text-left transition ${
              isActive
                ? "border-[var(--pm-brand-teal)] bg-white shadow-sm"
                : "border-[var(--pm-border)] bg-white/80 hover:border-[var(--pm-border-strong)]"
            }`}
          >
            <div className="pm-step-chip">Step {index + 1}</div>
            <div className="mt-1 break-words text-sm font-semibold text-[var(--pm-brand-navy)]">
              {step.title || file?.filePath || "Untitled step"}
            </div>
            <div className="mt-1 truncate text-xs text-[var(--pm-text-soft)]">
              {file?.filePath || step.prFileId}
            </div>
          </button>
        );
      })}
    </div>
  );
}
