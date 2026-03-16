"use client";

import { LookupFile } from "@/lib/patchmap/ui-types";
import { diffLineClass } from "@/lib/patchmap/ui-utils";

type DiffPanelProps = {
  file: LookupFile | null | undefined;
  className?: string;
};

export function DiffPanel({ file, className = "" }: DiffPanelProps) {
  return (
    <div className={`pm-diff ${className}`.trim()}>
      <div className="pm-diff-header">{file?.filePath ?? "Unknown file"}</div>
      {file?.patchText ? (
        <pre className="pm-diff-body">
          {file.patchText.split("\n").map((line, index) => (
            <span key={`${index}-${line}`} className={diffLineClass(line)}>
              {line}
            </span>
          ))}
        </pre>
      ) : (
        <div className="pm-diff-body">Diff content not available for this file.</div>
      )}
    </div>
  );
}
