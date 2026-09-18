# Images

| File | Source | Referenced by |
|---|---|---|
| `architecture.png` | **Generated** from the CDK code with `cdk-dia` (see [deployment](../deployment.md)) | `docs/deployment.md` |
| `social-flow.svg` / `.png` | **Hand-made**, for posts and slides outside this repo | Nothing |

The docs only reference diagrams that stay in sync on their own. `social-flow` is deliberately not used in the documentation: it is a summary drawn by hand, so it can go stale without making any guide wrong.

Re-render it after editing the SVG:
```bash
nix shell nixpkgs#librsvg --command rsvg-convert -w 1600 -h 900 \
  docs/images/social-flow.svg -o docs/images/social-flow.png
```
