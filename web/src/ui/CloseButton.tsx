import { Icon } from "./Icon";

// The round X of a sheet that floats over a screen
export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink"
    >
      <Icon name="close" className="size-4" />
    </button>
  );
}
