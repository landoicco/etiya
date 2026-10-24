import { Barbell } from "./Barbell";

// The app icon, drawn by the page so it follows the gradient and the text colour
export function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-brasa text-on-accent shadow-glow"
    >
      <Barbell className="size-11" />
    </span>
  );
}
