import { useEffect, useState } from "react";

// Asks the browser not to evict this site's storage. A refusal is not an error: the storage
// stays evictable and the app carries on
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
    return false;
  }
}

// null while the browser has not answered, which in Firefox lasts until the person does
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
