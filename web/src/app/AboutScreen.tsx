import type { ReactNode } from "react";
import type { Router } from "./router";

// The same dictionary entry the README links to, so both say the same thing
const DICTIONARY = "https://gdn.iib.unam.mx/diccionario/etiya/25282";
const REPOSITORY = "https://github.com/landoicco/etiya";
const GITHUB = "https://github.com/landoicco";
const LINKEDIN = "https://www.linkedin.com/in/landoicco";

export function AboutScreen({ router }: { router: Router }) {
  return (
    <main className="flex h-dvh flex-col">
      <div className="safe-x safe-top flex items-center justify-between gap-4 pb-3">
        <h1 className="text-2xl font-bold">About</h1>
        <button type="button" onClick={() => router.close()} className="h-11 shrink-0 px-2 text-sm text-muted">
          Back
        </button>
      </div>

      <div className="safe-x safe-bottom min-h-0 flex-1 space-y-6 overflow-y-auto pb-6">
        <section>
          <h2 className="text-3xl font-bold tracking-tight">Etiya</h2>
          <p className="mt-1 text-muted">Log your workouts, one set at a time.</p>
          <p className="mt-4">
            <em>Etiya</em> is Nahuatl for <Link href={DICTIONARY}>to become heavy</Link>, which is
            what the weight on the bar is meant to do.
          </p>
        </section>

        <p>
          Etiya is a personal project, built without any intention of profit. It started from a
          need of my own at the gym, and grew into a way to keep sharpening two kinds of skills at
          once: the technical ones while building it, and the physical ones while using it.
        </p>

        <section className="rounded-2xl border border-line bg-raised p-5">
          <p>For now, access is only allowed to specific users. Want to join? Contact me.</p>
          <p className="mt-3 flex gap-6 font-semibold">
            <Link href={GITHUB}>GitHub</Link>
            <Link href={LINKEDIN}>LinkedIn</Link>
          </p>
        </section>

        <section className="text-sm text-muted">
          <p>Developed by Lando Icaza · Version {APP_VERSION}</p>
          <p className="mt-2">
            <Link href={REPOSITORY}>Source code on GitHub</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

// Outside the app, in a new tab, so leaving About never closes the installed PWA
function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent-ink underline">
      {children}
    </a>
  );
}
