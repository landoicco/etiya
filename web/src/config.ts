// Values of the stack the app talks to. They are read at startup instead of being built in,
// so one build works for any stack and none of them is committed
export interface Config {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
}

const KEYS = ["apiUrl", "userPoolId", "userPoolClientId"] as const;

// Written next to the build by scripts/config.sh: by npm run deploy, or by npm run config for
// npm run dev
export async function loadConfig(): Promise<Config> {
  const response = await fetch("/config.json");
  // In development, Vite answers a missing file with index.html, so a failed parse means the
  // same as a 404
  const data: unknown = response.ok ? await response.json().catch(() => null) : null;

  if (!isConfig(data)) {
    throw new Error("config.json is missing or incomplete. Run npm run config and reload");
  }
  return data;
}

function isConfig(data: unknown): data is Config {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const values = data as Record<string, unknown>;
  return KEYS.every((key) => typeof values[key] === "string" && values[key] !== "");
}
