# Arcane Glow theme

**Date:** 2026-08-02
**Status:** Approved (direction and full-page mockup validated in visual companion;
mockups preserved under `.superpowers/brainstorm/73870-1785680757/content/`,
final: `arcane-full-v2.html`)

## Problem

The site's theme is a generic dark slate with one blue accent. The owner wants
it restyled around the site's emblem: a bronze clockwork automaton on a deep
navy field holding a glowing arcane-blue hologram. Chosen direction: "full
fantasy chrome", flavor **Arcane Glow** - the theme leans into the hologram's
light rather than the bronze metal. The emblem image itself appears nowhere.

## Palette

| Token | Value | Role |
|---|---|---|
| bg field | radial `#101b2c` -> `#0c1320` -> `#0a0e18` | page background, glow strongest at top |
| panel | `rgba(16,26,42,.85)` | cards, code, inputs |
| line | `rgba(88,198,255,.2)`-ish | hairline borders (arcane-tinted) |
| arcane | `#58c6ff` | accent, borders, glows, links |
| arcane soft | `#9adcff` / `#cfe9ff` | glowing text, TOC label |
| bright | `#eaf6ff` | headings, emphasized text |
| text | `#b6c2d4` (body), `#cfd8e6` (UI) | copy |
| dim | `#7e8ba0` | secondary text |
| bronze | `#c9a961` text / `#7a6234` border | ghost button, blockquote rule |
| stud gradient | `#e8c87a` -> `#8a6c33` | diamond studs (heading anchor, footer) |

## Typography

- **Marcellus** (OFL, single regular weight, latin woff2, self-hosted) for the
  site/addon name, page titles, and README h1-h3. Letter-spacing ~.04-.06em,
  arcane text-shadow halo.
- Body stays the system sans stack; code stays the mono stack. No other fonts.

## Component treatments (all in `THEME_CSS`)

- **Header**: arcane hairline bottom border with a soft downward glow shadow.
  Addon icon becomes a circle with an arcane ring + glow.
- **Buttons**: `.dl` becomes arcane glass (translucent blue fill, `#58c6ff`
  border, outer+inner glow, glowing text). `.dl.ghost` becomes bronze text +
  bronze border. Both become flex columns with centered content so a one-line
  ghost button aligns beside the two-line download button (mockup v2 fix).
- **Headings in `main`**: Marcellus, `#cfe9ff` with glow, arcane hairline
  underline, small bronze diamond sitting on the rule (pure CSS `::after` -
  no template changes).
- **TOC**: glowing uppercase "Contents" label; links dim -> bright.
- **Cards**: navy glass, arcane hairline border, hover brightens border and
  adds outer glow.
- **README content**: inline code gets a faint arcane tint box; `pre` gets a
  dark panel with subtle inner glow; tables get arcane hairlines and tinted
  header row; blockquotes get a bronze left rule.
- **Forms**: dark inputs with arcane hairline borders; focus = arcane border +
  glow (replacing the outline, but still visible focus). Intro box tinted
  arcane instead of the old accent.
- **Status boxes**: `.sent` becomes arcane blue glow (echoing the emblem's
  glowing checklist) instead of green. `.problems` stays red, tuned to the
  palette.
- **Footer**: arcane hairline top border with a centered bronze diamond stud
  (`::before`), centered dim text.
- 404/405/index pages inherit automatically via the shared shell.

Quality floor: visible focus everywhere, no motion (nothing to reduce),
contrast at or above the current theme's levels.

## Font delivery

The Lambda serves everything from memory, so the font follows the form.js
pattern:

- `packages/site/static/marcellus-latin.woff2` committed to the repo (~40 KB,
  OFL license - include `packages/site/static/OFL.txt`).
- A `font.ts` module reads it at cold start next to the built bundle (like
  `client-bundle.ts`; missing file degrades to the serif fallback stack, not
  a dead site).
- Handler route `GET /static/marcellus.woff2` serves it base64-encoded with
  `cache-control: public, max-age=31536000, immutable` (rename the file if it
  ever changes).
- `@font-face` in `THEME_CSS` with `font-display: swap`.
- `deploy.yml` copies `packages/site/static/*` into `dist/pkg/`.

## Testing

- Handler test: font route returns 200, woff2 content-type, base64 flag,
  immutable caching; missing font file degrades gracefully.
- Theme/template tests: keep existing structural assertions passing; update
  any that pin old colors. Add assertions that `THEME_CSS` declares the
  Marcellus `@font-face` and references `/static/marcellus.woff2`.

## Out of scope

- The emblem image (explicitly excluded from the site).
- Layout or template structure changes, light mode, animations.
