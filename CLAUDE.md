# CLAUDE.md

Etiya is a gym workout log: a Java API on AWS Lambda and a PWA. Start with [README.md](README.md); the why behind each choice is in [docs/decisions.md](docs/decisions.md).

## Layout

```
core/         the API (Spring Cloud Function, DynamoDB), Java 21
web/          the PWA (Vite, React, TypeScript, Tailwind), grouped by feature
infra/        AWS CDK in Java, one stack: EtiyaProd
bruno-tests/  API integration tests
scripts/      the seed exercise catalog
docs/         guides and decisions
flake.nix     the toolchain; `nix develop .#dev` for code, `.#infra` for the CDK
```

## Checks

```bash
cd web && npm run lint && npm test && npm run build
cd core && mvn test && mvn spotless:apply
cd infra && mvn test && cdk synth >/dev/null     # needs no credentials
docker compose up --build -d && (cd bruno-tests && bru run --env Local)
docker compose down                              # always, once done
```

CI runs the same: [.github/workflows/ci.yml](.github/workflows/ci.yml). The web app cannot be checked in a browser from here (it needs a real Cognito sign-in); the user tests it and reports back.

## How we work

- **Discuss first, then write.** Propose the change, wait for agreement, then edit.
- **Small steps: at most 10 files each.** A larger change is split, and every step leaves the checks green.
- **When two steps are pending, ask which one is next.** An ambiguous "go on" is not an answer.
- **The user runs git and `gh`.** Commits, pushes, merges, tags and releases are theirs. Suggest commit messages in their style: a title line, then ` - ` bullet lines, in English. Separate commits over one mixed commit.
- **`gh` is read-only here, and asked first.** PR status, CI runs, releases; nothing that writes.
- **Every `cdk` or `aws` command needs an explicit yes, per command.** `cdk diff` is run by Claude with the account ID masked; `cdk deploy`, `npm run deploy` and `npm run deploy:art` are run by the user.
- **Deploy scripts are tested offline**: a fake `aws` on `PATH` and no credentials, never a real run.
- **Simple first.** A working app over future-proofing; add the abstraction when it is needed.

## Conventions

- **Comments are one or two lines.** The rationale goes in `docs/decisions.md` or the commit message.
- **Web imports:** a sibling is `./X`, anything else `@/folder/X`; never `../`. One component per file when it is imported elsewhere.
- **Exercise names** follow `[Modifier] [Equipment] [Movement]`, singular. An exercise's id is the slug of its name, so renaming one is a migration.
- **The API changes only additively.** Installed apps and queued workouts on phones still speak the old shape.
- **UI copy is English**; extra information goes behind an icon or a sheet, not on an always-visible line.
- **Gym-domain assumptions come from the user**, not from guesses about how lifters train.
- **Releases:** tags `web-vX.Y.Z` and `api-vX.Y.Z`, one per PR, titled `<tag> · <summary>`. Fixes ship as patches.
- **Exercise art is private**: it lives outside the repo (`ART_DIR`) and in S3, never in `web/public/`.
