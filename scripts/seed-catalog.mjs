// Registers the common exercises in scripts/exercises.json in the shared catalog, through the API,
// so a new stack starts with a usable catalog. Safe to run again: an exercise that already exists
// gets 409 and is skipped, and nothing stored is ever changed.
//
// Usage, from the repository root:
//   node scripts/seed-catalog.mjs            the deployed stack (STACK, default EtiyaProd)
//   node scripts/seed-catalog.mjs --local    the Docker stack on localhost:8080
//
// Against AWS it signs in as ETIYA_USERNAME / ETIYA_PASSWORD, read from .env.<stack> if that
// file exists and from the environment otherwise, and needs AWS credentials to read the outputs.
// That user must be in the Cognito "admins" group, or every exercise fails with 403
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Paths are relative to the repository, wherever the script is run from
const root = fileURLToPath(new URL("..", import.meta.url));
// Resolved once and passed down to stack-output.sh, so the credentials, the API URL and the
// client id a run uses can never come from two different stacks
const stack = process.env.STACK ?? "EtiyaProd";
const exercises = JSON.parse(readFileSync(`${root}scripts/exercises.json`, "utf8"));
const target = process.argv.includes("--local") ? localTarget() : awsTarget();

const results = { created: [], existing: [], failed: [] };
for (const exercise of exercises) {
  const response = await fetch(`${target.apiUrl}/catalog/exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...target.headers },
    body: JSON.stringify(exercise),
  });

  if (response.status === 201) {
    results.created.push(exercise.name);
  } else if (response.status === 409) {
    results.existing.push(exercise.name);
  } else {
    const body = await response.text();
    results.failed.push(`${exercise.name}: HTTP ${response.status} ${body}`);
  }
}

console.log(`Created ${results.created.length}, already there ${results.existing.length}`);
for (const failure of results.failed) {
  console.error(`Failed: ${failure}`);
}
process.exit(results.failed.length === 0 ? 0 : 1);

// The local bridge takes the caller and their groups from headers instead of a token
function localTarget() {
  return {
    apiUrl: "http://localhost:8080",
    headers: { "X-User-Id": "catalog-seed", "X-User-Groups": "admins" },
  };
}

function awsTarget() {
  // One file per stack, so the credentials of two environments can never be confused for each
  // other. It is a convenience for throwaway dev users: production credentials do not go in a
  // file, they are exported into the environment for the one command that needs them
  const envFile = `${root}.env.${stack}`;
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
  const { ETIYA_USERNAME: username, ETIYA_PASSWORD: password } = process.env;
  if (!username || !password) {
    throw new Error(
      `Set ETIYA_USERNAME and ETIYA_PASSWORD for ${stack}, in .env.${stack} or the environment`,
    );
  }

  // The token is requested on the spot and only kept in memory, as in docs/testing.md
  const auth = JSON.parse(
    run("aws", [
      "cognito-idp",
      "initiate-auth",
      "--auth-flow",
      "USER_PASSWORD_AUTH",
      "--client-id",
      stackOutput("UserPoolClientId"),
      // As JSON, since the shorthand form breaks on a password with a comma
      "--auth-parameters",
      JSON.stringify({ USERNAME: username, PASSWORD: password }),
    ]),
  );

  return {
    apiUrl: stackOutput("ApiUrl"),
    headers: { Authorization: `Bearer ${auth.AuthenticationResult.AccessToken}` },
  };
}

function stackOutput(key) {
  return execFileSync(`${root}web/scripts/stack-output.sh`, [key], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, STACK: stack },
  }).trim();
}

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}
