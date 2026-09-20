import { useEffect, useState } from "react";

// A finished workout lives only on this phone until it reaches the API, and a browser is
// free to clear a site's storage to reclaim space. Persistent storage takes that right away.
// It is not asked for: Safari grants it to an app added to the home screen, Chrome to one it
// considers installed, and Firefox puts the question to the person. A browser without the
// API, or one that says no, simply leaves the storage evictable
export async function requestPersistence(): Promise<boolean> {
  // Typed as always present, but missing in older browsers and outside a secure context
  const storage = navigator.storage as StorageManager | undefined;

  try {
    if (typeof storage?.persist !== "function") {
      return false;
    }
    // Asking again once it has been granted is pointless, and in Firefox it would ask twice
    return (await storage.persisted()) || (await storage.persist());
  } catch {
    // Storage unavailable
    return false;
  }
}

// null while the browser has not answered yet, which in Firefox lasts until the person does.
// Asked for once at startup, so the guarantee is in place before there is anything to lose
export function usePersistence(): boolean | null {
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    let listening = true;
    void requestPersistence().then((granted) => {
      if (listening) {
        setPersisted(granted);
      }
    });
    return () => {
      listening = false;
    };
  }, []);

  return persisted;
}
