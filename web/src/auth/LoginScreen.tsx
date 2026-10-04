import { useState } from "react";
import { type Auth, AuthError, type User } from "./auth";
import { AuthForm, FIELD } from "./AuthForm";
import { ForgotPassword } from "./ForgotPassword";
import { NewPassword } from "./NewPassword";

interface Props {
  auth: Auth;
  onSignedIn: (user: User) => void;
}

// Kept in state rather than in the URL: the router starts after sign-in, and the
// new-password challenge lives in memory, so a reload could not resume it anyway
type Step = "sign-in" | "new-password" | "forgot-password";

// The app's own form instead of Cognito's hosted page, so it feels like an app. The
// autocomplete hints let the phone's password manager fill both fields
export function LoginScreen({ auth, onSignedIn }: Props) {
  const [step, setStep] = useState<Step>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function backToSignIn() {
    setPassword("");
    setError(null);
    setStep("sign-in");
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await auth.signIn(email.trim(), password);
      if (result.kind === "signed-in") {
        onSignedIn(result.user);
        return;
      }
      setStep("new-password");
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Could not sign in. Try again");
    }
    setSubmitting(false);
  }

  if (step === "new-password") {
    return <NewPassword auth={auth} onSignedIn={onSignedIn} onBack={backToSignIn} />;
  }

  if (step === "forgot-password") {
    return <ForgotPassword auth={auth} initialEmail={email} onSignedIn={onSignedIn} onBack={backToSignIn} />;
  }

  return (
    <AuthForm
      title="Etiya"
      subtitle="Sign in to log your workouts."
      onSubmit={() => void submit()}
      error={error}
      submitLabel={submitting ? "Signing in…" : "Sign in"}
      submitDisabled={submitting}
    >
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

      <button
        type="button"
        onClick={() => {
          setError(null);
          setStep("forgot-password");
        }}
        className="mt-2 h-11 self-start text-sm text-accent-ink"
      >
        Forgot password?
      </button>
    </AuthForm>
  );
}
