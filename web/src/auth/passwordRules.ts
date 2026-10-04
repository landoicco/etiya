// The pool's password policy (Auth.java), checked as the user types so nobody learns it
// by being refused. Cognito counts only these characters as symbols, and only A-Z as
// uppercase, so a letter like Ñ satisfies neither
const SYMBOLS = "^$*.[]{}()?-\"!@#%&/\\,><':;|_~`+=";

export interface PasswordRule {
  label: string;
  met: boolean;
}

export function passwordRules(password: string): PasswordRule[] {
  return [
    { label: "8 characters or more", met: password.length >= 8 },
    { label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { label: "A lowercase letter", met: /[a-z]/.test(password) },
    { label: "A number", met: /[0-9]/.test(password) },
    { label: "A symbol, like ! or #", met: [...password].some((char) => SYMBOLS.includes(char)) },
  ];
}

export function meetsPolicy(password: string): boolean {
  return passwordRules(password).every((rule) => rule.met);
}
