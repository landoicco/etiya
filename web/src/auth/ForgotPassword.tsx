import { useState } from "react";
import { type Auth, AuthError, type User } from "./auth";
import { AuthForm, FIELD } from "./AuthForm";
import { NewPasswordField } from "./NewPasswordField";
import { meetsPolicy } from "./passwordRules";

interface Props {
  auth: Auth;
  // Whatever was typed on the sign-in form, so it is not typed twice
  initialEmail: string;
  onSignedIn: (user: User) => void;
  onBack: () => void;
}

// Two steps: ask for a code by email, then trade it for a new password
export function ForgotPassword({ auth, initialEmail, onSignedIn, onBack }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function run(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Something went wrong. Try again");
    }
    setSubmitting(false);
  }

  if (!codeSent) {
    return (
      <AuthForm
        title="Reset password"
        subtitle="We will email you a code to choose a new one."
        onBack={onBack}
        onSubmit={() =>
          void run(async () => {
            await auth.requestPasswordReset(email.trim());
            setCodeSent(true);
          })
        }
        error={error}
        submitLabel={submitting ? "Sending…" : "Send code"}
        submitDisabled={submitting || email.trim() === ""}
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
            enterKeyHint="send"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={FIELD}
          />
        </label>
      </AuthForm>
    );
  }

  return (
    <AuthForm
      title="Reset password"
      // Said the same whether the account exists or not, so the form reveals neither
      subtitle={`If ${email.trim()} has an account, a code is on its way. It may land in spam.`}
      onBack={onBack}
      onSubmit={() =>
        void run(async () => {
          onSignedIn(await auth.confirmPasswordReset(email.trim(), code.trim(), password));
        })
      }
      error={error}
      submitLabel={submitting ? "Saving…" : "Save and sign in"}
      submitDisabled={submitting || code.trim() === "" || !meetsPolicy(password)}
    >
      <label className="block">
        <span className="text-sm text-muted">Code</span>
        <input
          type="text"
          name="code"
          required
          // Lets iOS offer the code straight from the email
          autoComplete="one-time-code"
          inputMode="numeric"
          enterKeyHint="next"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className={FIELD}
        />
      </label>

      <NewPasswordField value={password} onChange={setPassword} />

      <button
        type="button"
        onClick={() => {
          setCode("");
          setError(null);
          setCodeSent(false);
        }}
        className="mt-2 h-11 self-start text-sm text-accent-ink"
      >
        Send a new code
      </button>
    </AuthForm>
  );
}
