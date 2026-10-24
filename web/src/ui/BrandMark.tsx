// A stand-in for the logo, until the new icon is drawn
export function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-brasa text-on-accent shadow-glow"
    >
      <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" />
      </svg>
    </span>
  );
}
