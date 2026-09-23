import { useConfirm } from "./useConfirm";

// Two taps, since one misplaced thumb should not throw away an hour of training
export function DiscardButton({ onDiscard }: { onDiscard: () => void }) {
  const { armed, onClick } = useConfirm(onDiscard);

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        armed
          ? "h-12 w-full rounded-xl bg-danger text-sm font-semibold text-raised"
          : "h-12 w-full text-sm text-muted"
      }
    >
      {armed ? "Tap again to discard this workout" : "Discard workout"}
    </button>
  );
}
