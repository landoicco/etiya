import type { ReactNode } from "react";

// Rises from the bottom over a scrim; a tap on the scrim closes it, as the back gesture does
export function BottomSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end bg-scrim" onClick={onClose}>
      <section
        className="safe-x safe-bottom max-h-[85dvh] overflow-y-auto rounded-t-[28px] bg-raised pt-2.5"
        onClick={(event) => event.stopPropagation()}
      >
        <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        {children}
      </section>
    </div>
  );
}
