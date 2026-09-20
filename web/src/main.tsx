import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadActiveWorkout } from "./activeWorkout";
import { type Api, ApiError, createApi } from "./api";
import { type Auth, cognitoAuth, type User } from "./auth";
import { loadConfig } from "./config";
import { HomeScreen } from "./HomeScreen";
import { LoginScreen } from "./LoginScreen";
import { CATALOG_KEY, loadCachedCatalog } from "./exerciseCatalog";
import { useActiveWorkout } from "./useActiveWorkout";
import type { ActiveWorkout } from "./workout";
import { WorkoutScreen } from "./WorkoutScreen";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx will not change by asking again; network errors and 5xx get three tries
      retry: (failures, error) =>
        !(error instanceof ApiError && error.status < 500) && failures < 3,
    },
  },
});

interface AppProps {
  auth: Auth;
  api: Api;
  initialUser: User | null;
  initialWorkout: ActiveWorkout | null;
}

function App({ auth, api, initialUser, initialWorkout }: AppProps) {
  const [user, setUser] = useState(initialUser);
  // Renamed, because start() below is what mounts the app
  const { workout, start: startWorkout, update, discard } = useActiveWorkout(initialWorkout);

  if (!user) {
    return <LoginScreen auth={auth} onSignedIn={setUser} />;
  }

  async function signOut() {
    await auth.signOut();
    // The next user must not see this one's data, not even for a moment
    queryClient.clear();
    setUser(null);
  }

  // A workout in progress is the whole app until it is finished or discarded
  if (workout) {
    return <WorkoutScreen api={api} workout={workout} onChange={update} onDiscard={discard} />;
  }

  return <HomeScreen api={api} user={user} onSignOut={signOut} onStart={startWorkout} />;
}

function StartupError({ message }: { message: string }) {
  return (
    <main className="safe-padding flex min-h-dvh flex-col justify-center">
      <h1 className="text-xl font-semibold">Etiya could not start</h1>
      <p className="mt-2 text-muted">{message}</p>
    </main>
  );
}

// The session and the workout in progress are read before the first render, so a signed-in
// user never sees the login form flash by, and the app opens straight back into the workout
// that a killed PWA left behind. Until then the page shows the app's background color
async function start(container: HTMLElement) {
  const root = createRoot(container);
  try {
    const config = await loadConfig();
    const auth = cognitoAuth(config);
    const api = createApi(config.apiUrl, auth);
    const [user, workout, catalog] = await Promise.all([
      auth.currentUser(),
      loadActiveWorkout(),
      loadCachedCatalog(),
    ]);
    // The picker then opens on the copy this phone already has, and a fresh one replaces it
    // once it arrives, instead of showing an empty list on every launch
    if (catalog) {
      queryClient.setQueryData(CATALOG_KEY, catalog);
    }
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App auth={auth} api={api} initialUser={user} initialWorkout={workout} />
        </QueryClientProvider>
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
