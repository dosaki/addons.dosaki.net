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
  padding: 22px 0 40px; color: var(--dim); font-size: 13px;
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
  outline: 2px solid transparent; border-color: var(--accent); box-shadow: 0 0 12px var(--glow);
}
.field label.check { font-weight: 400; display: flex; gap: 8px; align-items: center; }
fieldset.field { border: 1px solid var(--line); border-radius: 6px; padding: 12px 14px; }
fieldset.field legend { color: var(--bright); font-weight: 600; padding: 0 6px; }
/* Honeypot: off-screen, not display:none - more autofill bots fall for it. */
.hp { position: absolute; left: -9999px; }
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
ul.reports { list-style: none; margin: 20px 0 8px; padding: 0; display: grid; gap: 14px; }
.card.report { justify-content: space-between; }
.card.report h2 { font-size: 16px; }
.votes { display: flex; gap: 8px; flex: none; }
button.vote {
  font: inherit; font-size: 14px; cursor: pointer;
  background: rgba(88, 198, 255, .08); color: var(--accent-soft);
  border: 1px solid rgba(88, 198, 255, .35); border-radius: 6px; padding: 7px 12px;
}
button.vote:hover { border-color: var(--accent); box-shadow: 0 0 12px var(--glow); }
.vote:disabled {
  cursor: default; opacity: .55; border-color: var(--bronze-line); color: var(--bronze);
  background: rgba(201, 169, 97, .05); box-shadow: none;
}
.vote .count { font-weight: 650; margin-left: 4px; }
.report-body { margin-top: 22px; }
.replies-title { font-size: 20px; margin-top: 36px; }
ul.replies { list-style: none; margin: 14px 0 40px; padding: 0; display: grid; gap: 12px; }
.reply {
  background: var(--panel); border: 1px solid var(--line-soft); border-radius: 8px;
  padding: 12px 16px;
}
.reply .hint { margin: 0 0 4px; }
.reply .dev { color: var(--bronze); }
`
