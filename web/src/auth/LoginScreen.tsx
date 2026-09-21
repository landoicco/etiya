import { type FormEvent, useState } from "react";
import { type Auth, AuthError, type User } from "./auth";

interface Props {
  auth: Auth;
  onSignedIn: (user: User) => void;
}

// The app's own form instead of Cognito's hosted page, so it feels like an app. The
// autocomplete hints let the phone's password manager fill both fields
export function LoginScreen({ auth, onSignedIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      onSignedIn(await auth.signIn(email.trim(), password));
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Could not sign in. Try again");
      setSubmitting(false);
    }
  }

  return (
    <main className="safe-padding flex min-h-dvh flex-col">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Etiya</h1>
        <p className="mt-1 text-muted">Sign in to log your workouts.</p>
      </header>

      {/* Fields on top, button at the bottom, in reach of the thumb */}
      <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
        <label className="block">
          <span className="text-sm text-muted">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={FIELD}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm text-muted">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            enterKeyHint="go"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={FIELD}
          />
        </label>

        {/* role=alert makes screen readers announce the error as soon as it appears */}
        <p role="alert" className="mt-4 min-h-6 text-sm text-red-400">
          {error}
        </p>

        <footer className="mt-auto pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-surface disabled:opacity-40"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </footer>
      </form>
    </main>
  );
}

// 16px text at least: iOS zooms into any smaller input when it gets focus
const FIELD =
  "mt-1 h-14 w-full rounded-xl border border-line bg-raised px-4 text-base outline-none focus:border-accent";
