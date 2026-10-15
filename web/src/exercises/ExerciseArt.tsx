import type { CSSProperties } from "react";
import { artUrl } from "./artIndex";

// Each picture is one colour used as a mask, so it is painted with the theme's tokens.
// The file holds two phases side by side, start and end
function mask(exerciseId: string, position: string, size: string): CSSProperties {
  const image = `url("${artUrl(exerciseId)}")`;
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: position,
    WebkitMaskPosition: position,
    maskSize: size,
    WebkitMaskSize: size,
  };
}

// The end phase alone, which is enough to recognise the exercise
export function ArtThumbnail({ exerciseId }: { exerciseId: string }) {
  return (
    <span
      aria-hidden="true"
      className="block size-12 bg-muted"
      style={mask(exerciseId, "right", "auto 100%")}
    />
  );
}

// A card over the picker, small enough to leave room around it: gone with a tap outside or
// the back gesture
export function ArtSheet({
  exerciseId,
  name,
  description,
  onClose,
}: {
  exerciseId: string;
  name: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div
      className="safe-x fixed inset-0 z-20 flex items-center justify-center bg-ink/40"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md rounded-3xl bg-surface px-5 pt-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 truncate text-xl font-bold">{name}</h2>
          <button type="button" onClick={onClose} className="h-11 shrink-0 px-2 text-sm text-muted">
            Close
          </button>
        </div>
        <div
          role="img"
          aria-label={`${name}, start and end`}
          className="mt-2 mb-6 aspect-[2/1] max-h-[40dvh] w-full bg-ink"
          style={mask(exerciseId, "center", "contain")}
        />
        {description && <p className="-mt-2 mb-6 text-sm text-muted">{description}</p>}
      </section>
    </div>
  );
}
