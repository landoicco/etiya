import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { type Auth, cognitoAuth, type User } from "./auth";
import { loadConfig } from "./config";
import { LoginScreen } from "./LoginScreen";
import "./index.css";

function App({ auth, initialUser }: { auth: Auth; initialUser: User | null }) {
  const [user, setUser] = useState(initialUser);

  if (!user) {
    return <LoginScreen auth={auth} onSignedIn={setUser} />;
  }

  async function signOut() {
    await auth.signOut();
    setUser(null);
  }

  return <HomeScreen user={user} onSignOut={signOut} />;
}

// Placeholder until the home screen lists workouts. It sets the layout every screen follows,
// with the content on top and the actions at the bottom, in reach of the thumb
function HomeScreen({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <main className="safe-padding flex min-h-dvh flex-col">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Etiya</h1>
          <p className="mt-1 truncate text-sm text-muted">{user.email ?? "Offline"}</p>
        </div>
        <button type="button" onClick={onSignOut} className="h-11 px-2 text-sm text-muted">
          Sign out
        </button>
      </header>

      <section className="mt-8 rounded-2xl border border-line bg-raised p-5">
        <p className="text-sm text-muted">No workouts yet.</p>
      </section>

      <footer className="mt-auto pt-6">
        <button
          type="button"
          disabled
          className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-surface disabled:opacity-40"
        >
          Start workout
        </button>
        <p className="mt-2 text-center text-xs text-muted">Coming soon</p>
      </footer>
    </main>
  );
}

function StartupError({ message }: { message: string }) {
  return (
    <main className="safe-padding flex min-h-dvh flex-col justify-center">
      <h1 className="text-xl font-semibold">Etiya could not start</h1>
      <p className="mt-2 text-muted">{message}</p>
    </main>
  );
}

// The session is read before the first render, so a signed-in user never sees the login
// form flash by. Until then the page shows the app's background color
async function start(container: HTMLElement) {
  const root = createRoot(container);
  try {
    const auth = cognitoAuth(await loadConfig());
    const user = await auth.currentUser();
    root.render(
      <StrictMode>
        <App auth={auth} initialUser={user} />
      </StrictMode>,
    );
  } catch (error) {
    root.render(<StartupError message={error instanceof Error ? error.message : String(error)} />);
  }
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element in index.html");
}
void start(container);
