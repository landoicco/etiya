import type { ReactNode } from "react";
import { BrandMark } from "@/ui/BrandMark";
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
        <h1 className="text-2xl font-bold tracking-tight">About</h1>
        <button type="button" onClick={() => router.close()} className="h-11 shrink-0 px-2 text-sm text-muted">
          Back
        </button>
      </div>

      <div className="safe-x safe-bottom min-h-0 flex-1 space-y-6 overflow-y-auto pb-6">
        <section>
          <div className="flex items-center gap-4 pt-2">
            <BrandMark />
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight">Etiya</h2>
              <p className="text-sm text-muted">Log your workouts, one set at a time.</p>
            </div>
          </div>
          <p className="mt-5">
            <em>Etiya</em> is Nahuatl for <Link href={DICTIONARY}>to become heavy</Link>, which is
            what the weight on the bar is meant to do.
          </p>
        </section>

        <p>
          Etiya is a personal project, built without any intention of profit. It started from a
          need of my own at the gym, and grew into a way to keep sharpening two kinds of skills at
          once: the technical ones while building it, and the physical ones while using it.
        </p>

        <section className="rounded-card border border-line bg-raised p-5 shadow-card">
          <p>For now, access is only allowed to specific users. Want to join? Contact me.</p>
          <div className="mt-4 flex gap-2.5">
            <ContactLink href={GITHUB}>GitHub</ContactLink>
            <ContactLink href={LINKEDIN}>LinkedIn</ContactLink>
          </div>
        </section>

        <section className="text-center text-sm text-muted">
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

function ContactLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="grid h-12 flex-1 place-items-center rounded-btn border border-line bg-surface font-semibold"
    >
      {children}
    </a>
  );
}
