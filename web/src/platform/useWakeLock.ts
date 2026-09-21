import { useEffect } from "react";

// Keeps the screen on while a workout is open: between sets nobody wants to unlock a phone
// with chalk on their hands. The browser drops the lock whenever the app goes to the
// background, so it is taken again on the way back. Where it does not exist, nothing happens
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let finished = false;

    async function acquire() {
      // Requesting one while hidden is rejected, and the cleanup may already have run
      if (finished || document.visibilityState !== "visible") {
        return;
      }
      try {
        const lock = await navigator.wakeLock.request("screen");
        // The screen was left while the request was in flight: release it, or it stays on
        if (finished) {
          void lock.release();
        } else {
          sentinel = lock;
        }
      } catch {
        // Denied, or the battery is too low for the browser to allow it
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", acquire);

    return () => {
      finished = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release();
    };
  }, []);
}
