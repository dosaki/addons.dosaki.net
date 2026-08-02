# Remove GitHub from user-facing copy

**Date:** 2026-08-02
**Status:** Approved

## Problem

The report flow's copy mentions GitHub in three places. Visitors were never
told the backend files GitHub issues, so the mentions answer a question no
user has, and leak an implementation detail they don't need to care about.

## Design

Copy-only changes; no behavioural change. The backend still files GitHub
issues.

1. **Report list hint** (`packages/site/src/templates.ts`):
   "No GitHub account needed - reports are filed for you." becomes
   "No account needed - reports go straight to the developer."
2. **No-JS warning** (`packages/site/src/templates.ts`): drop the trailing
   "you can also report on GitHub directly if you have an account" so it
   reads "Sending a report needs JavaScript enabled - the site signs your
   submission before forwarding it."
3. **Success message** (`packages/site/client/form.tsx`):
   "your report has been filed as #37" becomes "your report has been
   filed. Your report number is 37." - the number stays as a plain
   reference users can quote, without the `#` issue idiom.

## Testing

`templates.test.ts` pins the old hint ("no github account"); update it to
assert the new copy and that "github" never appears in report-flow pages.
The island's success copy is not currently pinned by tests; add the number
rendering to the existing client test only if one covers submission.
