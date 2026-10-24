// Line icons on a 24px grid, drawn in the text colour; play is the one filled shape
const PATHS = {
  play: "M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z",
  check: "m5 12.5 4.5 4.5L19 7.5",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
  stats: "M5 20V12M12 20V5M19 20v-9",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-3.5-3.5",
  cloud: "M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9zM12 12v4M12 12l-2 2M12 12l2 2",
  pin: "M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10zM12 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  signOut: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10",
  close: "M6 6l12 12M18 6 6 18",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const filled = name === "play";
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
