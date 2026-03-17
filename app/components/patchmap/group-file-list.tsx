"use client";

import { LookupFile } from "@/lib/patchmap/ui-types";
import { FileChip } from "@/app/components/patchmap/file-chip";

type GroupFileListProps = {
  fileIds: string[];
  fileMap: Map<string, LookupFile>;
  selectedFileId: string | null;
  onSelect: (fileId: string) => void;
  draggable?: boolean;
  fullWidth?: boolean;
  onDragStart?: (fileId: string) => void;
  onDragEnd?: () => void;
  emptyMessage?: string;
  addPrefix?: string;
};

export function GroupFileList({
  fileIds,
  fileMap,
  selectedFileId,
  onSelect,
  draggable = false,
  fullWidth = false,
  onDragStart,
  onDragEnd,
  emptyMessage,
  addPrefix,
}: GroupFileListProps) {
  if (fileIds.length === 0) {
    return emptyMessage ? (
      <div className="w-full rounded-lg border border-dashed border-[var(--pm-border)] px-3 py-2 text-xs text-[var(--pm-text-soft)]">
        {emptyMessage}
      </div>
    ) : null;
  }

  return (
    <div className={fullWidth ? "grid gap-2" : "flex flex-wrap gap-2"}>
      {fileIds.map((fileId) => {
        const file = fileMap.get(fileId);
        return (
          <FileChip
            key={fileId}
            label={file?.filePath ?? fileId}
            title={file?.filePath ?? fileId}
            active={selectedFileId === fileId}
            draggable={draggable}
            fullWidth={fullWidth}
            onDragStart={onDragStart ? () => onDragStart(fileId) : undefined}
            onDragEnd={onDragEnd}
            onClick={() => onSelect(fileId)}
            prefix={addPrefix}
          />
        );
      })}
    </div>
  );
}
