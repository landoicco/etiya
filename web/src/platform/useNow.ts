import { useEffect, useState } from "react";

// The clock is only ever read to the second, and browsers throttle this to a crawl while the
// app is in the background, which is exactly when nobody is looking at it
export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}
