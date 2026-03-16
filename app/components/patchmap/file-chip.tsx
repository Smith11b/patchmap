"use client";

type FileChipProps = {
  label: string;
  active?: boolean;
  title?: string;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  prefix?: string;
};

export function FileChip({
  label,
  active = false,
  title,
  draggable = false,
  onClick,
  onDragStart,
  onDragEnd,
  prefix,
}: FileChipProps) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-[var(--pm-brand-teal)] bg-[rgba(20,151,154,0.12)] text-[var(--pm-brand-navy)]"
          : "border-[var(--pm-border)] bg-white text-[var(--pm-text-soft)] hover:border-[var(--pm-border-strong)]"
      }`}
      title={title ?? label}
    >
      {prefix ? `${prefix} ` : ""}
      {label}
    </button>
  );
}
