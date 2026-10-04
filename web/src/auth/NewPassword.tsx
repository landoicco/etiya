import { useState } from "react";
import { type Auth, AuthError, type User } from "./auth";
import { AuthForm } from "./AuthForm";
import { NewPasswordField } from "./NewPasswordField";
import { meetsPolicy } from "./passwordRules";

interface Props {
  auth: Auth;
  onSignedIn: (user: User) => void;
  onBack: () => void;
}

// A first sign-in with the temporary password from the invitation email
export function NewPassword({ auth, onSignedIn, onBack }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      onSignedIn(await auth.confirmNewPassword(password));
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Could not save your password. Try again");
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Choose your password"
      subtitle="The one in the invitation was only to get you here."
      onBack={onBack}
      onSubmit={() => void submit()}
      error={error}
      submitLabel={submitting ? "Saving…" : "Save and sign in"}
      submitDisabled={submitting || !meetsPolicy(password)}
    >
      <NewPasswordField value={password} onChange={setPassword} />
    </AuthForm>
  );
}
