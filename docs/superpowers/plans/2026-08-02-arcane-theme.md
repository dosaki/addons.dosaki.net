# Arcane Glow Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle addons.dosaki.net with the approved "Arcane Glow" theme (spec: `docs/superpowers/specs/2026-08-02-arcane-theme-design.md`) — glowing arcane-blue on deep navy with bronze accents, headings in a self-hosted Marcellus font.

**Architecture:** The whole visual identity lives in one CSS string (`THEME_CSS` in `packages/site/src/theme.ts`) injected into every page by the shared `shell()`, so the restyle is one file rewrite. The only new machinery is font delivery: the site is a Lambda that serves everything from memory, so the woff2 is committed to the repo, read at cold start (mirroring `client-bundle.ts`), and served base64-encoded from a new `/static/marcellus.woff2` route.

**Tech Stack:** TypeScript, vitest, esbuild (deploy-time), AWS Lambda behind CloudFront. No new dependencies.

## Global Constraints

- No template/HTML structure changes; diamonds and studs are `::before`/`::after` (spec: "no template changes").
- The emblem image appears nowhere on the site.
- Marcellus is the ONLY webfont; body stays the system sans stack, code stays the mono stack.
- Font route caching: `public, max-age=31536000, immutable`; a changed font means a renamed file.
- Missing font file must degrade (serif fallback stack), never a dead site — same policy as `client-bundle.ts`.
- These three existing `THEME_CSS` rules must survive verbatim (pinned by `theme.test.ts`): `main img:not([height]) { height: auto; }`, `main img[height]:not([width]) { width: auto; }`, `main [align="center"] img { margin-inline: auto; }`.
- Run all commands from the repo root: `/Users/tiagocorreia/pdev/addons.dosaki.net`.

---

### Task 1: Vendor the Marcellus font

**Files:**
- Create: `packages/site/static/marcellus-latin.woff2`
- Create: `packages/site/static/OFL.txt`

**Interfaces:**
- Produces: the woff2 file at `packages/site/static/marcellus-latin.woff2`, which Task 2's loader reads and `deploy.yml` copies.

- [ ] **Step 1: Download the latin woff2 from Google Fonts**

Google's css2 endpoint serves woff2 URLs only to modern browser user-agents, so pass one:

```bash
CSS=$(curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Marcellus&display=swap")
echo "$CSS" | grep -o 'https://fonts.gstatic.com/[^)]*\.woff2' | head -5
```

The output lists one URL per unicode-range subset. Take the one from the `/* latin */` block (the LAST block in the CSS — verify by looking at `echo "$CSS"` directly), then:

```bash
curl -s -o packages/site/static/marcellus-latin.woff2 "<the latin woff2 url>"
```

- [ ] **Step 2: Verify it is a real woff2**

```bash
file packages/site/static/marcellus-latin.woff2 && ls -l packages/site/static/marcellus-latin.woff2
```

Expected: `Web Open Font Format (Version 2)` and a size between 15 KB and 60 KB. If `file` says HTML or the size is tiny, the URL was wrong — redo Step 1.

- [ ] **Step 3: Add the OFL license text**

```bash
curl -s -o packages/site/static/OFL.txt "https://raw.githubusercontent.com/google/fonts/main/ofl/marcellus/OFL.txt"
head -3 packages/site/static/OFL.txt
```

Expected: first lines mention Copyright and "SIL Open Font License". If the URL 404s, copy the license text from https://openfontlicense.org (Version 1.1) with the Marcellus copyright line: `Copyright (c) 2011 by Brian J. Bonislawsky DBA Astigmatic (AOETI) (astigma@astigmatic.com), with Reserved Font Names "Marcellus"`.

- [ ] **Step 4: Commit**

```bash
git add packages/site/static/marcellus-latin.woff2 packages/site/static/OFL.txt
git commit -m "Vendor the Marcellus latin woff2 (OFL)"
```

---

### Task 2: Serve the font from the Lambda

**Files:**
- Create: `packages/site/src/font.ts`
- Modify: `packages/site/src/handler.ts` (add route next to the existing `/static/form.js` block at ~line 80)
- Modify: `.github/workflows/deploy.yml` (one `cp` line after `cp packages/site/src/site-data.json dist/pkg/`, ~line 79)
- Test: `packages/site/test/font.test.ts`, `packages/site/test/handler.test.ts`

**Interfaces:**
- Consumes: `packages/site/static/marcellus-latin.woff2` from Task 1.
- Produces: `export const marcellusFont: string | null` (base64 woff2) from `packages/site/src/font.ts`; route `GET /static/marcellus.woff2` → 200 base64 response, or 404 when the file is absent. Task 3's CSS references the URL `/static/marcellus.woff2`.

- [ ] **Step 1: Write the failing tests**

Create `packages/site/test/font.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { marcellusFont } from '../src/font.js'

describe('marcellusFont', () => {
  it('loads the vendored woff2 as base64', () => {
    // In this repo the file exists at packages/site/static/, so the loader
    // must find it via the ../static fallback path.
    expect(marcellusFont).not.toBeNull()
    // woff2 magic bytes are wOF2 -> "d09GMg" in base64.
    expect(marcellusFont!.startsWith('d09GMg')).toBe(true)
  })
})
```

Append to the `describe('route', ...)` block in `packages/site/test/handler.test.ts`:

```ts
  it('serves the marcellus font base64-encoded and cached forever', () => {
    const r = route(site, 'GET', '/static/marcellus.woff2') as Response
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toBe('font/woff2')
    expect(r.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(r.isBase64Encoded).toBe(true)
    expect(r.body.startsWith('d09GMg')).toBe(true)
  })
```

Also create `packages/site/test/font-missing.test.ts` — the degrade path the spec requires (a missing font must 404, not kill the site):

```ts
import { describe, expect, it, vi } from 'vitest'
import { route } from '../src/handler.js'
import type { Response } from '../src/handler.js'
import type { SiteData } from '../src/types.js'

// Hoisted above the imports by vitest, so handler.js sees the mocked module.
vi.mock('../src/font.js', () => ({ marcellusFont: null }))

const site: SiteData = { addons: [], unavailable: [] }

describe('route with the font file missing', () => {
  it('404s the font route instead of crashing', () => {
    const r = route(site, 'GET', '/static/marcellus.woff2') as Response
    expect(r.statusCode).toBe(404)
  })

  it('still serves pages', () => {
    expect((route(site, 'GET', '/') as Response).statusCode).toBe(200)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/site/test/font.test.ts packages/site/test/font-missing.test.ts packages/site/test/handler.test.ts`
Expected: font.test.ts and font-missing.test.ts FAIL at import ("Failed to resolve import ../src/font.js"); the new handler test FAILS with a 404 response.

- [ ] **Step 3: Write `packages/site/src/font.ts`**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Read at module load, like the client bundle - and equally NOT allowed to
 * be fatal. A missing font degrades to the CSS serif fallback stack, not a
 * dead site. Two locations: next to the built module (Lambda, where
 * deploy.yml copies it into the package root) and ../static (repo layout,
 * which is what tests and local runs see).
 */
function read(): string | null {
  for (const path of [
    join(import.meta.dirname, 'marcellus-latin.woff2'),
    join(import.meta.dirname, '..', 'static', 'marcellus-latin.woff2'),
  ]) {
    try {
      return readFileSync(path).toString('base64')
    } catch {
      // try the next location
    }
  }
  console.error('marcellus-latin.woff2 missing; headings fall back to serif')
  return null
}

export const marcellusFont = read()
```

- [ ] **Step 4: Add the route to `packages/site/src/handler.ts`**

Add the import at the top, next to the `clientBundle` import:

```ts
import { marcellusFont } from './font.js'
```

Insert this block immediately after the `/static/form.js` block (after its closing `}`, ~line 91), reusing the existing `IMMUTABLE` constant:

```ts
  if (clean === '/static/marcellus.woff2') {
    // Never changes without being renamed, so it can cache forever.
    if (marcellusFont === null) return html(404, notFoundPage(site.addons))
    return {
      statusCode: 200,
      headers: { 'content-type': 'font/woff2', 'cache-control': IMMUTABLE },
      body: marcellusFont,
      isBase64Encoded: true,
    }
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run packages/site/test/font.test.ts packages/site/test/handler.test.ts`
Expected: all PASS.

- [ ] **Step 6: Make deploy copy the font next to the built module**

In `.github/workflows/deploy.yml`, directly after the line `cp packages/site/src/site-data.json dist/pkg/` (~line 79), add:

```yaml
          # Read at runtime by font.ts, same pattern as site-data.json above.
          cp packages/site/static/marcellus-latin.woff2 dist/pkg/
```

(Indentation must match the surrounding `run:` block — the `cp` above it is the reference.)

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/site/src/font.ts packages/site/src/handler.ts packages/site/test/font.test.ts packages/site/test/handler.test.ts .github/workflows/deploy.yml
git commit -m "Serve the vendored Marcellus font from memory, cached forever"
```

---

### Task 3: The Arcane Glow THEME_CSS

**Files:**
- Modify: `packages/site/src/theme.ts` (full rewrite of the `THEME_CSS` string and its header comment)
- Test: `packages/site/test/theme.test.ts`

**Interfaces:**
- Consumes: the URL `/static/marcellus.woff2` served by Task 2.
- Produces: the same `export const THEME_CSS: string` — no consumer changes.

- [ ] **Step 1: Add failing theme tests**

Append to the `describe('THEME_CSS', ...)` block in `packages/site/test/theme.test.ts`:

```ts
  it('self-hosts Marcellus for display type', () => {
    expect(THEME_CSS).toContain('@font-face')
    expect(THEME_CSS).toContain("font-family: 'Marcellus'")
    expect(THEME_CSS).toContain('/static/marcellus.woff2')
    expect(THEME_CSS).toContain('font-display: swap')
  })

  it('files the success box under arcane blue, not the old green', () => {
    expect(THEME_CSS).not.toContain('#2d6a4f')
    expect(THEME_CSS).not.toContain('#12211a')
  })
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run packages/site/test/theme.test.ts`
Expected: the two new tests FAIL; the three existing image-rule tests PASS.

- [ ] **Step 3: Rewrite `packages/site/src/theme.ts`**

Replace the whole file with:

```ts
/**
 * "Arcane Glow": the site's emblem is a bronze automaton holding a glowing
 * blue hologram, and the theme takes the hologram's side - luminous arcane
 * hairlines and glows on a deep navy field, bronze demoted to studs and
 * secondary controls. Dark stays non-negotiable: the content is screenshots
 * of a dark game UI, and on a light page each becomes a hard rectangle
 * punched through the layout.
 * Spec: docs/superpowers/specs/2026-08-02-arcane-theme-design.md
 */
export const THEME_CSS = `
@font-face {
  font-family: 'Marcellus';
  src: url('/static/marcellus.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
:root {
  --bg: #0a0e18; --panel: rgba(16, 26, 42, .85); --well: #0a101c;
  --line: rgba(88, 198, 255, .2); --line-soft: rgba(88, 198, 255, .15);
  --text: #b6c2d4; --ui: #cfd8e6; --bright: #eaf6ff; --dim: #7e8ba0;
  --accent: #58c6ff; --accent-soft: #9adcff; --accent-pale: #cfe9ff;
  --glow: rgba(88, 198, 255, .35);
  --bronze: #c9a961; --bronze-line: #7a6234;
  --display: 'Marcellus', 'Iowan Old Style', Georgia, serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}
* { box-sizing: border-box; }
body {
  margin: 0; color: var(--ui);
  background: var(--bg) radial-gradient(120% 900px at 50% 0, #101b2c 0%, #0c1320 55%, rgba(10, 14, 24, 0) 100%) no-repeat;
  font: 16px/1.65 ui-sans-serif, system-ui, -apple-system, sans-serif;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
header.site {
  border-bottom: 1px solid rgba(88, 198, 255, .32); padding: 20px 0;
  box-shadow: 0 14px 34px -20px rgba(88, 198, 255, .4);
}
header.site .row { display: flex; align-items: center; gap: 14px; }
header.site img.icon {
  width: 44px; height: 44px; border-radius: 50%;
  border: 1px solid rgba(88, 198, 255, .8); box-shadow: 0 0 12px var(--glow);
}
header.site h1 {
  margin: 0; font: 400 24px/1.2 var(--display); color: var(--bright);
  letter-spacing: .06em; text-shadow: 0 0 18px rgba(88, 198, 255, .55);
}
header.site p { margin: 2px 0 0; color: var(--dim); font-size: 14px; }
header.site a.logo {
  display: flex; align-items: center; gap: 14px;
  color: var(--bright); text-decoration: none;
}
header.site a.logo:hover { text-decoration: none; }
.dl {
  margin-left: auto; display: flex; flex-direction: column; justify-content: center;
  text-align: center; background: rgba(88, 198, 255, .12); color: var(--accent-soft);
  border: 1px solid var(--accent); border-radius: 6px; padding: 9px 16px;
  font-weight: 650; font-size: 14px; text-shadow: 0 0 8px rgba(88, 198, 255, .7);
  box-shadow: 0 0 16px var(--glow), inset 0 0 10px rgba(88, 198, 255, .1);
}
.dl:hover {
  text-decoration: none;
  box-shadow: 0 0 24px rgba(88, 198, 255, .55), inset 0 0 12px rgba(88, 198, 255, .18);
}
.dl small { display: block; font-weight: 400; opacity: .75; font-size: 11px; text-shadow: none; }
.cols { display: flex; gap: 40px; align-items: flex-start; padding: 28px 0 64px; }
nav.toc {
  position: sticky; top: 22px; width: 210px; flex: none;
  max-height: calc(100vh - 44px); overflow-y: auto;
}
nav.toc h2 {
  font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--accent-soft); text-shadow: 0 0 10px rgba(88, 198, 255, .4);
  margin: 0 0 10px;
}
nav.toc ul { list-style: none; margin: 0; padding: 0; }
nav.toc li { margin: 0 0 7px; }
nav.toc a { color: var(--dim); font-size: 14px; }
nav.toc a:hover { color: var(--bright); text-decoration: none; }
main { flex: 1; min-width: 0; }
main h1, main h2, main h3 {
  font-family: var(--display); font-weight: 400; letter-spacing: .04em;
  color: var(--accent-pale); line-height: 1.3;
  text-shadow: 0 0 14px rgba(88, 198, 255, .35);
}
main h2 {
  margin-top: 38px; padding-bottom: 8px; position: relative;
  border-bottom: 1px solid var(--line);
}
main h2::after {
  content: ""; position: absolute; bottom: -4px; left: 0; width: 7px; height: 7px;
  transform: rotate(45deg); background: linear-gradient(135deg, #e8c87a, #8a6c33);
}
main p, main li { color: var(--text); }
main img { max-width: 100%; border-radius: 6px; display: block; margin: 16px 0; }
/* Screenshots carry no dimensions - keep their aspect ratio and fit the column. */
main img:not([height]) { height: auto; }
/* An explicit height in a README is the author's intent, so let the attribute
   through by setting no height here at all; width: auto keeps the aspect
   ratio - unless width is ALSO explicit, which is equally the author's
   intent and must pass through untouched too, exactly the override this
   rule exists to avoid on height. max-width above still stops either case
   overflowing a narrow column. */
main img[height]:not([width]) { width: auto; }
/* display: block ignores the parent's text-align, so centre it properly. */
main [align="center"] img { margin-inline: auto; }
main table { border-collapse: collapse; width: 100%; margin: 16px 0; display: block; overflow-x: auto; }
main th, main td { border: 1px solid var(--line-soft); padding: 8px 11px; text-align: left; }
main th { background: rgba(88, 198, 255, .07); color: var(--accent-pale); }
main code {
  font-family: var(--mono); font-size: .9em; color: var(--accent-pale);
  background: rgba(88, 198, 255, .08); border: 1px solid rgba(88, 198, 255, .14);
  padding: 1px 6px; border-radius: 4px;
}
main pre {
  background: var(--well); border: 1px solid var(--line-soft); border-radius: 7px;
  padding: 14px; overflow-x: auto; color: #a8c8e8;
  box-shadow: inset 0 0 24px rgba(88, 198, 255, .04);
}
main pre code { background: none; border: none; padding: 0; color: inherit; }
main blockquote { border-left: 3px solid var(--bronze-line); margin: 16px 0; padding: 2px 0 2px 16px; color: var(--dim); }
.cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); padding: 28px 0; }
.card {
  background: var(--panel); border: 1px solid var(--line); border-radius: 8px;
  padding: 18px; display: flex; align-items: center; gap: 14px;
  box-shadow: inset 0 0 22px rgba(88, 198, 255, .04);
}
a.card:hover {
  text-decoration: none; border-color: rgba(88, 198, 255, .7);
  box-shadow: 0 0 18px rgba(88, 198, 255, .18), inset 0 0 22px rgba(88, 198, 255, .06);
}
.card img.icon {
  width: 40px; height: 40px; border-radius: 50%; flex: none;
  border: 1px solid rgba(88, 198, 255, .5); box-shadow: 0 0 8px rgba(88, 198, 255, .3);
}
.card > div { min-width: 0; }
.card h2 { margin: 0 0 6px; font-size: 18px; color: var(--bright); }
.card p { margin: 0; color: var(--dim); font-size: 14px; }
.card.off { opacity: .55; }
footer.site {
  position: relative; text-align: center; border-top: 1px solid var(--line-soft);
  padding: 22px 0 40px; color: #5c6a80; font-size: 13px;
}
footer.site::before {
  content: ""; position: absolute; top: -4px; left: 50%; width: 8px; height: 8px;
  transform: translateX(-50%) rotate(45deg);
  background: linear-gradient(135deg, #e8c87a, #8a6c33);
}
@media (max-width: 780px) {
  .cols { display: block; }
  nav.toc { position: static; width: auto; margin-bottom: 24px; }
}
.page {
  font: 400 26px/1.3 var(--display); letter-spacing: .04em; color: var(--bright);
  text-shadow: 0 0 16px rgba(88, 198, 255, .4); margin: 26px 0 6px;
}
.crumb { margin: 22px 0 0; font-size: 13px; }
.field { margin: 22px 0; }
.field label { display: block; color: var(--bright); font-weight: 600; margin-bottom: 5px; }
.field .opt { color: var(--dim); font-weight: 400; font-size: 12px; }
.field .hint { color: var(--dim); font-size: 13px; margin: 0 0 7px; }
.field input[type=text], .field textarea, .field select {
  width: 100%; background: rgba(10, 16, 28, .9); color: var(--ui);
  border: 1px solid rgba(88, 198, 255, .25); border-radius: 6px; padding: 9px 11px;
  font: inherit;
}
.field textarea.mono { font-family: var(--mono); font-size: 13px; }
.field input:focus, .field textarea:focus, .field select:focus {
  outline: none; border-color: var(--accent); box-shadow: 0 0 12px var(--glow);
}
.field label.check { font-weight: 400; display: flex; gap: 8px; align-items: center; }
fieldset.field { border: 1px solid var(--line); border-radius: 6px; padding: 12px 14px; }
fieldset.field legend { color: var(--bright); font-weight: 600; padding: 0 6px; }
.intro { background: rgba(88, 198, 255, .05); border-left: 3px solid var(--accent);
  padding: 11px 14px; border-radius: 0 6px 6px 0; color: var(--dim); margin: 18px 0; }
.dl.ghost {
  background: rgba(201, 169, 97, .04); color: var(--bronze);
  border: 1px solid var(--bronze-line); box-shadow: none; text-shadow: none;
}
.dl.ghost:hover { box-shadow: 0 0 12px rgba(201, 169, 97, .25); }
.problems { background: rgba(72, 20, 26, .5); border: 1px solid #8a3a42; border-radius: 7px;
  padding: 11px 14px; margin: 18px 0; color: #f3b0b6; }
.sent {
  background: rgba(88, 198, 255, .07); border: 1px solid var(--accent); border-radius: 7px;
  padding: 16px; color: var(--accent-pale);
  box-shadow: 0 0 22px rgba(88, 198, 255, .2), inset 0 0 18px rgba(88, 198, 255, .06);
}
`
```

- [ ] **Step 4: Run the theme and template tests**

Run: `npx vitest run packages/site/test/theme.test.ts packages/site/test/templates.test.ts`
Expected: all PASS (the three pinned image rules were carried over verbatim; templates only assert structure and copy, not colors).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/site/src/theme.ts packages/site/test/theme.test.ts
git commit -m "Restyle the site with the Arcane Glow theme"
```

---

### Task 4: Visual verification against real pages

**Files:**
- No source changes expected; fixes discovered here loop back into Task 3's files.

**Interfaces:**
- Consumes: `addonPage`, `indexPage`, `reportFormPage` from `packages/site/src/templates.ts`, and fixture data shaped like `packages/site/test/handler.test.ts`'s `addon` const.

- [ ] **Step 1: Render real pages to HTML files**

Write a throwaway script `render-preview.mts` in the scratchpad directory (NOT the repo), then run it with `npx tsx`:

```ts
import { writeFileSync } from 'node:fs'
import { addonPage, indexPage, reportFormPage } from './packages/site/src/templates.js'
import type { AddonPage } from './packages/site/src/types.js'

const addon: AddonPage = {
  slug: 'survivalrp',
  name: 'SurvivalRP',
  tagline: 'Immersive survival roleplay for WoW',
  version: '1.2.2',
  icon: undefined,
  html: [
    '<h2 id="what">What it does</h2>',
    '<p>Track hunger, thirst and warmth as you roam Azeroth. Type <code>/srp</code> to open settings.</p>',
    '<pre><code>/srp eat -- consume the food in your bags</code></pre>',
    '<table><tr><th>Need</th><th>Decay</th></tr><tr><td>Hunger</td><td>1% / 4 min</td></tr></table>',
    '<blockquote><p>Nothing is written to your character until you opt in.</p></blockquote>',
  ].join(''),
  headings: [{ id: 'what', text: 'What it does' }],
  forms: [{
    key: 'bug_report', name: 'Bug report', description: 'Something is broken.',
    labels: [],
    fields: [
      { type: 'textarea', id: 'what', label: 'What happened?', required: true },
      { type: 'input', id: 'version', label: 'Game version', required: false },
    ],
  }],
  assets: new Map(),
}

const out = process.argv[2] ?? '.'
writeFileSync(`${out}/preview-addon.html`, addonPage(addon))
writeFileSync(`${out}/preview-index.html`, indexPage([addon], ['brokenaddon']))
writeFileSync(`${out}/preview-form.html`, reportFormPage(addon, addon.forms[0]!))
```

Run from the repo root (adjust the import paths to absolute paths if tsx complains):
`npx tsx <scratchpad>/render-preview.mts <scratchpad>`

Note: `field` objects must match the repo's real `FormDefinition` type in `packages/site/src/types.ts` — check it first and adjust the fixture if the shapes differ (e.g. field `type` names).

- [ ] **Step 2: Screenshot each page**

Open each `preview-*.html` file with the Playwright browser tools (or `open` + eyeball), at 1280px and 500px widths. Check: Marcellus renders as fallback serif (the font route needs the Lambda; the fallback stack standing in is expected here), buttons vertically centered, heading diamonds sit on their rules, focus glow on inputs, footer stud centered, mobile layout intact.

- [ ] **Step 3: Fix anything off, rerun the suite, amend Task 3's commit if the fix is CSS-only**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 4: Show the user**

Push the rendered pages through the brainstorm companion (if still running) or attach screenshots, and get sign-off before pushing to main.
