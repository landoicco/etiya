# Images

| File | Source | Referenced by |
|---|---|---|
| `architecture.png` | **Generated** from the CDK code with `cdk-dia`, from `EtiyaProd` (see [deployment](../deployment.md)) | `docs/deployment.md` |
| `banner.svg` / `.png` | **Hand-made**: the app's icon, name and two screens, as the repo's header | `README.md` |
| `social-flow.svg` / `.png` | **Hand-made**: the request path from the phone to DynamoDB, for posts and slides outside this repo | Nothing |
| `showcase.svg` / `.png` | **Hand-made**: the app's screens with its name and stack, as a cover image for posts and project pages | Nothing |

The docs only reference diagrams that stay in sync on their own. The hand-made images are deliberately not used in the documentation: they are summaries drawn by hand, so they can go stale without making any guide wrong. The banner is the one exception, since it shows only the name and the look. The workouts shown in the screens are sample data.

Re-render them after editing an SVG. They are drawn in Inter, so point fontconfig at it, or the PNGs fall back to a wider font:
```bash
INTER=$(nix build nixpkgs#inter --no-link --print-out-paths)
printf '<fontconfig><dir>%s/share/fonts</dir><include>/etc/fonts/fonts.conf</include></fontconfig>' "$INTER" > /tmp/fonts.conf
FONTCONFIG_FILE=/tmp/fonts.conf nix shell nixpkgs#librsvg --command sh -c '
  rsvg-convert -w 1600 -h 400 docs/images/banner.svg -o docs/images/banner.png
  rsvg-convert -w 1600 -h 900 docs/images/social-flow.svg -o docs/images/social-flow.png
  rsvg-convert -w 1600 -h 900 docs/images/showcase.svg -o docs/images/showcase.png'
```
