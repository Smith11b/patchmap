"use client";

type FileChipProps = {
  label: string;
  active?: boolean;
  title?: string;
  draggable?: boolean;
  fullWidth?: boolean;
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
  fullWidth = false,
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
      className={`${fullWidth ? "w-full" : "max-w-full"} min-w-0 rounded-2xl border px-3 py-1 text-left text-xs font-medium leading-5 transition ${
        active
          ? "border-[var(--pm-brand-teal)] bg-[rgba(20,151,154,0.12)] text-[var(--pm-brand-navy)]"
          : "border-[var(--pm-border)] bg-white text-[var(--pm-text-soft)] hover:border-[var(--pm-border-strong)]"
      }`}
      title={title ?? label}
    >
      <span className="block max-w-full break-all whitespace-normal">
        {prefix ? `${prefix} ` : ""}
        {label}
      </span>
    </button>
  );
}
