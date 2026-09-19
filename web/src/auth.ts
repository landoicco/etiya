import { Amplify } from "aws-amplify";
import { fetchAuthSession, getCurrentUser, signIn, signOut } from "aws-amplify/auth";
import type { Config } from "./config";

export interface User {
  // Unknown when the app opens offline with an expired token: the session is still valid,
  // but reading it needs a refresh, which needs the network
  email: string | null;
}

// What the app needs from a login. Screens only see this, never Amplify, so a local mode
// without Cognito can be added later behind the same interface
export interface Auth {
  currentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  // For the Authorization header; refreshed first when it has expired
  getAccessToken(): Promise<string>;
}

export type AuthErrorReason = "invalid-credentials" | "offline" | "unsupported" | "unknown";

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

    async signIn(email, password) {
      try {
        const { isSignedIn, nextStep } = await signIn({ username: email, password });
        if (!isSignedIn) {
          // A temporary password or MFA. Users are created with a permanent password and MFA
          // is off, so these only show up if the account was set up differently
          throw new AuthError(
            "unsupported",
            `This account needs a step the app does not support yet (${nextStep.signInStep})`,
          );
        }
        return { email };
      } catch (error) {
        throw toAuthError(error);
      }
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

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error;
  }
  if (isNetworkError(error)) {
    return new AuthError("offline", "No connection. Try again when you are back online");
  }
  // The pool hides whether the user exists, so a wrong email also lands here
  if (error instanceof Error && error.name === "NotAuthorizedException") {
    return new AuthError("invalid-credentials", "Wrong email or password");
  }
  return new AuthError("unknown", "Could not sign in. Try again");
}

// Amplify wraps a failed fetch in this. Only the error counts, not navigator.onLine: offline
// with no session at all is still signed out
function isNetworkError(error: unknown): boolean {
  return error instanceof Error && error.name === "NetworkError";
}
