import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadActiveWorkout } from "@/workout/activeWorkout";
import { type Api, ApiError, createApi } from "@/platform/api";
import { type Auth, cognitoAuth, type User } from "@/auth/auth";
import { loadConfig } from "@/platform/config";
import { HistoryScreen } from "@/history/HistoryScreen";
import { HomeScreen } from "@/app/HomeScreen";
import { LoginScreen } from "@/auth/LoginScreen";
import { CATALOG_KEY, loadCachedCatalog } from "@/exercises/exerciseCatalog";
import { GYMS_KEY, loadCachedGyms } from "@/gyms/gyms";
import { HOME, useRouter } from "@/app/router";
import { usePersistence } from "@/platform/storage";
import { loadPending, type PendingWorkout, useSendQueue } from "@/platform/sendQueue";
import { useActiveWorkout } from "@/workout/useActiveWorkout";
import type { ActiveWorkout } from "@/workout/workout";
import { WorkoutDetail } from "@/history/WorkoutDetail";
import { WorkoutScreen } from "@/workout/WorkoutScreen";
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
  initialPending: PendingWorkout[];
}

function App({ auth, api, initialUser, initialWorkout, initialPending }: AppProps) {
  const [user, setUser] = useState(initialUser);
  // Renamed, because start() below is what mounts the app
  const { workout, start: startWorkout, update, clear } = useActiveWorkout(initialWorkout);
  const queue = useSendQueue(api, initialPending);
  const router = useRouter();
  // Asked for once here rather than per screen: what it protects is the queue, which outlives
  // any of them
  const persisted = usePersistence();

  // A workout in progress owns the screens under /workout, and nothing else may claim them.
  // Replacing rather than opening keeps the back gesture out of a screen that is now gone,
  // which is what a link to /workout/finish after the workout was saved would otherwise be
  const inWorkout = UNDER_WORKOUT.has(router.route.name);
  useEffect(() => {
    if (inWorkout && workout === null) {
      router.replace(HOME);
    } else if (!inWorkout && workout !== null) {
      router.replace({ name: "logging" });
    }
  }, [inWorkout, workout, router]);

  if (!user) {
    return <LoginScreen auth={auth} onSignedIn={setUser} />;
  }

  async function signOut() {
    await auth.signOut();
    // The next user must not see this one's data, not even for a moment
    queryClient.clear();
    setUser(null);
  }

  if (workout && inWorkout) {
    return (
      <WorkoutScreen
        api={api}
        workout={workout}
        router={router}
        onChange={update}
        onFinish={(request) => {
          // Queued first, then forgotten: the send is the queue's problem from here, and
          // the gym is where a phone is least likely to have a connection
          void queue.add(request);
          clear();
          router.replace(HOME);
        }}
        onDiscard={() => {
          clear();
          router.replace(HOME);
        }}
      />
    );
  }

  if (router.route.name === "history") {
    return <HistoryScreen api={api} router={router} />;
  }

  if (router.route.name === "workout") {
    return <WorkoutDetail api={api} id={router.route.id} router={router} />;
  }

  return (
    <HomeScreen
      api={api}
      user={user}
      queue={queue}
      persisted={persisted}
      router={router}
      onStarted={(gym) => {
        startWorkout(gym);
        router.replace({ name: "logging" });
      }}
      onSignOut={signOut}
    />
  );
}

// The routes that only mean anything while a workout is being logged
const UNDER_WORKOUT = new Set(["logging", "exercises", "newExercise", "finish"]);

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
    const [user, workout, catalog, gyms, pending] = await Promise.all([
      auth.currentUser(),
      loadActiveWorkout(),
      loadCachedCatalog(),
      loadCachedGyms(),
      loadPending(),
    ]);
    // The pickers then open on the copies this phone already has, and fresh ones replace them
    // once they arrive, instead of showing an empty list on every launch
    if (catalog) {
      queryClient.setQueryData(CATALOG_KEY, catalog);
    }
    if (gyms) {
      queryClient.setQueryData(GYMS_KEY, gyms);
    }
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App
            auth={auth}
            api={api}
            initialUser={user}
            initialWorkout={workout}
            initialPending={pending}
          />
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
