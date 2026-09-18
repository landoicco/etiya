import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// Placeholder screen for the skeleton: it sets the layout every screen follows, with the
// content on top and the actions at the bottom, in reach of the thumb
function App() {
  return (
    <main className="safe-padding flex min-h-dvh flex-col">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Etiya</h1>
        <p className="mt-1 text-muted">Log your workouts, one set at a time.</p>
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

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element in index.html");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
