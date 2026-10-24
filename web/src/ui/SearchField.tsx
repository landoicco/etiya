import type { InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

// Words get capitals and no autocorrect: gym and exercise names are proper nouns
export function SearchField({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={`flex h-14 min-w-0 items-center gap-2 rounded-btn border border-line bg-raised px-4 text-muted focus-within:border-accent-ink ${className}`}
    >
      <Icon name="search" />
      <input
        type="search"
        enterKeyHint="search"
        autoCapitalize="words"
        autoCorrect="off"
        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
        {...rest}
      />
    </label>
  );
}
