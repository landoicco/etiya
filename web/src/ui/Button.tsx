import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "accent";

const VARIANTS: Record<Variant, string> = {
  primary: "h-16 bg-brasa text-lg font-bold text-on-accent shadow-glow disabled:shadow-none",
  secondary: "h-14 border border-line bg-raised font-semibold",
  accent: "h-14 border-[1.5px] border-accent-ink font-semibold text-accent-ink",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
}

export function Button({ variant = "primary", icon, type = "button", className = "", children, ...rest }: Props) {
  return (
    <button
      type={type}
      className={`flex w-full items-center justify-center gap-2 truncate rounded-btn px-4 transition-transform active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
