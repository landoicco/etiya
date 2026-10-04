import { useState } from "react";
import { FIELD } from "./AuthForm";
import { passwordRules } from "./passwordRules";

interface Props {
  value: string;
  onChange: (password: string) => void;
}

// One field with Show instead of a second one to repeat it: seeing what was typed catches
// the same typo, without typing it twice on a phone
export function NewPasswordField({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mt-4">
      <label className="block">
        <span className="text-sm text-muted">New password</span>
        <div className="relative">
          <input
            type={visible ? "text" : "password"}
            name="new-password"
            required
            // Lets the phone's password manager offer to generate and save one
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={`${FIELD} pr-20`}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-pressed={visible}
            className="absolute top-1 right-0 h-14 px-4 text-sm text-muted"
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <ul className="mt-3 space-y-1 text-sm">
        {passwordRules(value).map((rule) => (
          <li key={rule.label} className={rule.met ? "text-ink" : "text-muted"}>
            <span aria-hidden="true" className="inline-block w-5">
              {rule.met ? "✓" : "·"}
            </span>
            {rule.label}
            <span className="sr-only">{rule.met ? ", done" : ", missing"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
