# Images

| File | Source | Referenced by |
|---|---|---|
| `architecture.svg` / `.png` | **Hand-made**: the `EtiyaProd` stack, one box per CDK construct with its real settings | `docs/deployment.md` |
| `banner.svg` / `.png` | **Hand-made**: the app's icon, name and two screens, as the repo's header | `README.md` |
| `social-flow.svg` / `.png` | **Hand-made**: the request path from the phone to DynamoDB, for posts and slides outside this repo | Nothing |
| `showcase.svg` / `.png` | **Hand-made**: the app's screens with its name and stack, as a cover image for posts and project pages | Nothing |
| `social-preview.svg` / `.png` | **Hand-made**: icon, name, promise and two screens at 1280×640, the card shown when the repo's link is shared | GitHub, uploaded in Settings → Social preview |

The docs only reference diagrams that stay in sync on their own. The hand-made images are deliberately not used in the documentation: they are summaries drawn by hand, so they can go stale without making any guide wrong. There are two exceptions. The banner shows only the name and the look. The architecture replaced a `cdk-dia` drawing that was right by construction but hard to read; it is redrawn with any change to `infra/`, and `cdk-dia` stays as the check (see [deployment](../deployment.md)). The social preview lives on GitHub rather than in the repo's pages, so a new PNG has to be uploaded again by hand. The workouts shown in the screens are sample data.

Re-render them after editing an SVG. They are drawn in Inter, so point fontconfig at it, or the PNGs fall back to a wider font:
```bash
INTER=$(nix build nixpkgs#inter --no-link --print-out-paths)
printf '<fontconfig><dir>%s/share/fonts</dir><include>/etc/fonts/fonts.conf</include></fontconfig>' "$INTER" > /tmp/fonts.conf
FONTCONFIG_FILE=/tmp/fonts.conf nix shell nixpkgs#librsvg --command sh -c '
  rsvg-convert -w 1600 -h 1000 docs/images/architecture.svg -o docs/images/architecture.png
  rsvg-convert -w 1600 -h 400 docs/images/banner.svg -o docs/images/banner.png
  rsvg-convert -w 1600 -h 900 docs/images/social-flow.svg -o docs/images/social-flow.png
  rsvg-convert -w 1600 -h 900 docs/images/showcase.svg -o docs/images/showcase.png
  rsvg-convert -w 1280 -h 640 docs/images/social-preview.svg -o docs/images/social-preview.png'
```
