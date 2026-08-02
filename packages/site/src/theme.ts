/**
 * Dark and understated, one accent. Chosen for the content rather than taste:
 * the pages are mostly screenshots of a dark game UI on dark backgrounds, and
 * on a light page each becomes a hard rectangle punched through the layout.
 */
export const THEME_CSS = `
:root {
  --bg: #0d0f12; --panel: #14171c; --line: #1e232b;
  --text: #d6dae1; --bright: #f2f4f8; --dim: #8b93a1;
  --accent: #6aa3f0;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.65 ui-sans-serif, system-ui, -apple-system, sans-serif;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
header.site { border-bottom: 1px solid var(--line); padding: 20px 0; }
header.site .row { display: flex; align-items: center; gap: 14px; }
header.site img.icon { width: 44px; height: 44px; border-radius: 8px; }
header.site h1 { margin: 0; font-size: 22px; color: var(--bright); }
header.site p { margin: 2px 0 0; color: var(--dim); font-size: 14px; }
.dl {
  margin-left: auto; background: var(--accent); color: #08111f;
  border-radius: 6px; padding: 9px 16px; font-weight: 650; font-size: 14px;
}
.dl:hover { text-decoration: none; filter: brightness(1.08); }
.dl small { display: block; font-weight: 400; opacity: .75; font-size: 11px; }
.cols { display: flex; gap: 40px; align-items: flex-start; padding: 28px 0 64px; }
nav.toc {
  position: sticky; top: 22px; width: 210px; flex: none;
  max-height: calc(100vh - 44px); overflow-y: auto;
}
nav.toc h2 {
  font-size: 11px; letter-spacing: .09em; text-transform: uppercase;
  color: var(--dim); margin: 0 0 10px;
}
nav.toc ul { list-style: none; margin: 0; padding: 0; }
nav.toc li { margin: 0 0 7px; }
nav.toc a { color: var(--dim); font-size: 14px; }
nav.toc a:hover { color: var(--bright); }
main { flex: 1; min-width: 0; }
main h1, main h2, main h3 { color: var(--bright); line-height: 1.3; }
main h2 { margin-top: 38px; padding-top: 6px; border-top: 1px solid var(--line); }
main img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 16px 0; }
main table { border-collapse: collapse; width: 100%; margin: 16px 0; display: block; overflow-x: auto; }
main th, main td { border: 1px solid var(--line); padding: 8px 11px; text-align: left; }
main th { background: var(--panel); color: var(--bright); }
main code { font-family: var(--mono); font-size: .9em; background: var(--panel); padding: 2px 5px; border-radius: 4px; }
main pre { background: var(--panel); padding: 14px; border-radius: 6px; overflow-x: auto; }
main pre code { background: none; padding: 0; }
main blockquote { border-left: 3px solid var(--line); margin: 16px 0; padding: 2px 0 2px 16px; color: var(--dim); }
.cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); padding: 28px 0; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
.card h2 { margin: 0 0 6px; font-size: 18px; color: var(--bright); }
.card p { margin: 0; color: var(--dim); font-size: 14px; }
.card.off { opacity: .55; }
footer.site { border-top: 1px solid var(--line); padding: 22px 0 40px; color: var(--dim); font-size: 13px; }
@media (max-width: 780px) {
  .cols { display: block; }
  nav.toc { position: static; width: auto; margin-bottom: 24px; }
}
.page { font-size: 24px; color: var(--bright); margin: 26px 0 6px; }
.crumb { margin: 22px 0 0; font-size: 13px; }
.field { margin: 22px 0; }
.field label { display: block; color: var(--bright); font-weight: 600; margin-bottom: 5px; }
.field .opt { color: var(--dim); font-weight: 400; font-size: 12px; }
.field .hint { color: var(--dim); font-size: 13px; margin: 0 0 7px; }
.field input[type=text], .field textarea, .field select {
  width: 100%; background: var(--panel); color: var(--text);
  border: 1px solid var(--line); border-radius: 6px; padding: 9px 11px;
  font: inherit;
}
.field textarea.mono { font-family: var(--mono); font-size: 13px; }
.field input:focus, .field textarea:focus, .field select:focus {
  outline: 2px solid var(--accent); outline-offset: -1px;
}
.field label.check { font-weight: 400; display: flex; gap: 8px; align-items: center; }
fieldset.field { border: 1px solid var(--line); border-radius: 6px; padding: 12px 14px; }
fieldset.field legend { color: var(--bright); font-weight: 600; padding: 0 6px; }
.intro { background: var(--panel); border-left: 3px solid var(--accent);
  padding: 11px 14px; border-radius: 0 6px 6px 0; color: var(--dim); margin: 18px 0; }
.dl.ghost { background: none; color: var(--accent); border: 1px solid var(--line); }
.problems { background: #2a1416; border: 1px solid #5c2b30; border-radius: 6px;
  padding: 11px 14px; margin: 18px 0; color: #f3b0b6; }
.sent { background: #12211a; border: 1px solid #2d6a4f; border-radius: 6px;
  padding: 16px; color: #b7e4c7; }
`
