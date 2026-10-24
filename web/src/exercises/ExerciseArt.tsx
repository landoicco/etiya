import type { CSSProperties } from "react";
import { CloseButton } from "@/ui/CloseButton";
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
    <span aria-hidden="true" className="grid size-13 place-items-center rounded-[14px] bg-soft">
      <span className="block size-10 bg-accent-ink" style={mask(exerciseId, "right", "auto 100%")} />
    </span>
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
      className="safe-x fixed inset-0 z-20 flex items-center justify-center bg-scrim"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md rounded-[26px] bg-raised px-5 pt-4 pb-5 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 truncate text-xl font-bold tracking-tight">{name}</h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="mt-3 rounded-[14px] border border-line bg-surface p-3">
          <div
            role="img"
            aria-label={`${name}, start and end`}
            className="aspect-[2/1] max-h-[40dvh] w-full bg-ink"
            style={mask(exerciseId, "center", "contain")}
          />
        </div>
        {description && <p className="mt-3 text-sm text-muted">{description}</p>}
      </section>
    </div>
  );
}
