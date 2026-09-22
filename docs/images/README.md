# Images

| File | Source | Referenced by |
|---|---|---|
| `architecture.png` | **Generated** from the CDK code with `cdk-dia`, from `EtiyaProd` (see [deployment](../deployment.md)) | `docs/deployment.md` |
| `social-flow.svg` / `.png` | **Hand-made**: the request path from the phone to DynamoDB, for posts and slides outside this repo | Nothing |
| `showcase.svg` / `.png` | **Hand-made**: the app's screens with its name and stack, as a cover image for posts and project pages | Nothing |

The docs only reference diagrams that stay in sync on their own. The hand-made images are deliberately not used in the documentation: they are summaries drawn by hand, so they can go stale without making any guide wrong. The workouts shown in `showcase` are sample data.

Re-render them after editing an SVG:
```bash
nix shell nixpkgs#librsvg --command sh -c '
  rsvg-convert -w 1600 -h 900 docs/images/social-flow.svg -o docs/images/social-flow.png
  rsvg-convert -w 1600 -h 900 docs/images/showcase.svg -o docs/images/showcase.png'
```
