// Same shapes as public/icon.svg, on its 512 grid with the empty margin trimmed
export function Barbell({ className }: { className?: string }) {
  return (
    <svg viewBox="80 80 352 352" aria-hidden="true" className={className} fill="currentColor">
      <rect x="92" y="243" width="328" height="26" rx="13" />
      <rect x="134" y="164" width="44" height="184" rx="16" />
      <rect x="186" y="198" width="28" height="116" rx="12" />
      <rect x="334" y="164" width="44" height="184" rx="16" />
      <rect x="298" y="198" width="28" height="116" rx="12" />
    </svg>
  );
}
