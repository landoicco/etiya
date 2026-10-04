import { Amplify } from "aws-amplify";
import {
  confirmResetPassword,
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  signIn,
  signOut,
} from "aws-amplify/auth";
import type { Config } from "@/platform/config";

export interface User {
  // Unknown when the app opens offline with an expired token: the session is still valid,
  // but reading it needs a refresh, which needs the network
  email: string | null;
}

// What the app needs from a login. Screens only see this, never Amplify, so a local mode
// without Cognito can be added later behind the same interface
export interface Auth {
  currentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<SignInResult>;
  // Replaces the temporary password of a first sign-in, and finishes signing in
  confirmNewPassword(password: string): Promise<User>;
  // Sends a code by email. Resolves the same whether the account exists or not
  requestPasswordReset(email: string): Promise<void>;
  // Sets the new password and signs in with it
  confirmPasswordReset(email: string, code: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  // For the Authorization header; refreshed first when it has expired
  getAccessToken(): Promise<string>;
}

// A user created with a temporary password must choose their own before signing in
export type SignInResult = { kind: "signed-in"; user: User } | { kind: "new-password-required" };

export type AuthErrorReason =
  | "invalid-credentials"
  | "expired-invitation"
  | "invalid-password"
  | "invalid-code"
  | "too-many-attempts"
  | "session-expired"
  | "offline"
  | "unsupported"
  | "unknown";

export class AuthError extends Error {
  readonly reason: AuthErrorReason;

  constructor(reason: AuthErrorReason, message: string) {
    super(message);
    this.name = "AuthError";
    this.reason = reason;
  }
}

// Cognito through Amplify, with SRP: the password never leaves the phone
export function cognitoAuth(config: Config): Auth {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
      },
    },
  });

  // Who is answering the new-password challenge: Cognito's reply to it does not say
  let pendingEmail: string | null = null;

  async function signInWith(email: string, password: string): Promise<SignInResult> {
    try {
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      if (isSignedIn) {
        return { kind: "signed-in", user: { email } };
      }
      if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        // Amplify keeps the challenge in memory; confirmNewPassword answers it
        pendingEmail = email;
        return { kind: "new-password-required" };
      }
      // MFA is off, so nothing else should show up
      throw unsupported(nextStep.signInStep);
    } catch (error) {
      throw toAuthError(error, "Could not sign in. Try again");
    }
  }

  return {
    async currentUser() {
      try {
        const user = await getCurrentUser();
        return { email: user.signInDetails?.loginId ?? null };
      } catch (error) {
        // An expired token that cannot be refreshed offline. Amplify keeps the session, and
        // sending the user to the login form in the middle of a workout would be worse
        if (isNetworkError(error)) {
          return { email: null };
        }
        // No session, or Cognito rejected it
        return null;
      }
    },

    signIn: signInWith,

    async confirmNewPassword(password) {
      try {
        const { isSignedIn, nextStep } = await confirmSignIn({ challengeResponse: password });
        if (!isSignedIn) {
          throw unsupported(nextStep.signInStep);
        }
        return { email: pendingEmail };
      } catch (error) {
        throw toAuthError(error, "Could not save your password. Try again");
      }
    },

    async requestPasswordReset(email) {
      try {
        await resetPassword({ username: email });
      } catch (error) {
        // Saying so would tell anyone which emails have an account
        if (error instanceof Error && error.name === "UserNotFoundException") {
          return;
        }
        // The email was never verified, so Cognito has nowhere to send a code
        if (error instanceof Error && error.name === "InvalidParameterException") {
          throw new AuthError(
            "unsupported",
            "This account cannot reset its password by email. Ask whoever invited you",
          );
        }
        throw toAuthError(error, "Could not send the code. Try again");
      }
    },

    async confirmPasswordReset(email, code, password) {
      try {
        await confirmResetPassword({ username: email, confirmationCode: code, newPassword: password });
      } catch (error) {
        throw toAuthError(error, "Could not save your password. Try again");
      }
      const result = await signInWith(email, password);
      if (result.kind !== "signed-in") {
        throw unsupported(result.kind);
      }
      return result.user;
    },

    async signOut() {
      await signOut();
    },

    async getAccessToken() {
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken) {
        throw new AuthError("unknown", "Not signed in");
      }
      return tokens.accessToken.toString();
    },
  };
}

function unsupported(step: string): AuthError {
  return new AuthError("unsupported", `This account needs a step the app does not support yet (${step})`);
}

function toAuthError(error: unknown, fallback: string): AuthError {
  if (error instanceof AuthError) {
    return error;
  }
  if (isNetworkError(error)) {
    return new AuthError("offline", "No connection. Try again when you are back online");
  }
  if (!(error instanceof Error)) {
    return new AuthError("unknown", fallback);
  }
  switch (error.name) {
    // Cognito uses this one name for several failures, told apart only by the message
    case "NotAuthorizedException":
      // Both mean the temporary password was not used within 7 days; only a new one helps
      if (/temporary password has expired|cannot be reset in the current state/i.test(error.message)) {
        return new AuthError(
          "expired-invitation",
          "Your invitation has expired. Ask whoever invited you to send a new one",
        );
      }
      if (/attempts exceeded/i.test(error.message)) {
        return new AuthError("too-many-attempts", "Too many attempts. Wait a few minutes and try again");
      }
      // The new-password step lasts 3 minutes
      if (/session is expired/i.test(error.message)) {
        return new AuthError("session-expired", "That took too long. Go back and sign in again");
      }
      if (/user is disabled/i.test(error.message)) {
        return new AuthError("unsupported", "This account is disabled");
      }
      return new AuthError("invalid-credentials", "Wrong email or password");
    // Same message as a wrong password, so the form never reveals which emails have an account
    case "UserNotFoundException":
      return new AuthError("invalid-credentials", "Wrong email or password");
    case "InvalidPasswordException":
      return new AuthError("invalid-password", "That password does not meet the rules");
    case "CodeMismatchException":
      return new AuthError("invalid-code", "That code is not right. Check the email and try again");
    case "ExpiredCodeException":
      return new AuthError("invalid-code", "That code has expired. Ask for a new one");
    case "LimitExceededException":
    case "TooManyRequestsException":
    case "TooManyFailedAttemptsException":
      return new AuthError("too-many-attempts", "Too many attempts. Wait a few minutes and try again");
    default:
      return new AuthError("unknown", fallback);
  }
}

// Amplify wraps a failed fetch in this. Only the error counts, not navigator.onLine: offline
// with no session at all is still signed out
function isNetworkError(error: unknown): boolean {
  return error instanceof Error && error.name === "NetworkError";
}
