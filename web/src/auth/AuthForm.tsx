import type { FormEvent, ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  // Absent on the sign-in form itself, which has nowhere to go back to
  onBack?: () => void;
  onSubmit: () => void;
  error: string | null;
  submitLabel: string;
  submitDisabled: boolean;
  children: ReactNode;
}

// The frame every sign-in step shares: fields on top, the button at the bottom, in reach
// of the thumb
export function AuthForm({ title, subtitle, onBack, onSubmit, error, submitLabel, submitDisabled, children }: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <main className="safe-padding flex min-h-dvh flex-col">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted">{subtitle}</p>
        </div>
        {onBack && (
          <button type="button" onClick={onBack} className="h-11 shrink-0 px-2 text-sm text-muted">
            Back
          </button>
        )}
      </header>

      <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
        {children}

        {/* role=alert makes screen readers announce the error as soon as it appears */}
        <p role="alert" className="mt-4 min-h-6 text-sm text-danger">
          {error}
        </p>

        <footer className="mt-auto pt-6">
          <button
            type="submit"
            disabled={submitDisabled}
            className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-on-accent disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </footer>
      </form>
    </main>
  );
}

// 16px text at least: iOS zooms into any smaller input when it gets focus
export const FIELD =
  "mt-1 h-14 w-full rounded-xl border border-line bg-raised px-4 text-base outline-none focus:border-accent-ink";
