# addons.dosaki.net

Generator that turns a WoW addon's README, GitHub issue-form templates and screenshots into a `site-bundle.zip`, meant to be attached to each GitHub release. A website reads those bundles to render an addon's page, including its issue/feedback forms.

## What's in here

- `packages/bundle` - the generator itself (Node 22, ESM, TypeScript run directly via `tsx`, no build step). `src/cli.ts` is the entry point; `src/readme.ts`, `src/forms.ts` and `src/images.ts` do the actual rewriting, parsing and encoding, and `src/bundle.ts` zips the result.
- `actions/bundle` - a composite GitHub Action other repos `uses:` to build their bundle in CI (e.g. as a release step). It installs this repo's dependencies and runs the CLI with the action's inputs mapped to `INPUT_*` environment variables.

## Using `actions/bundle` from another repo

```yaml
- uses: dosaki/addons.dosaki.net/actions/bundle@v1
  with:
    slug: survivalrp
    name: SurvivalRP
    tagline: Optional survival mechanics for World of Warcraft role-play.
    version: ${{ github.ref_name }}
    interface: '120007'
    out: site-bundle.zip
```

`slug`, `name`, `tagline` and `version` are required; `interface`, `readme`, `templates-dir` and `out` have defaults - see `actions/bundle/action.yml` for the full list.

## Running the generator locally

```
npm ci
INPUT_SLUG=survivalrp INPUT_NAME=SurvivalRP \
INPUT_TAGLINE="Optional survival mechanics for World of Warcraft role-play." \
INPUT_VERSION=1.2.2 INPUT_INTERFACE=120007 INPUT_OUT=/tmp/site-bundle.zip \
GITHUB_WORKSPACE=/path/to/the/addon/repo npx tsx packages/bundle/src/cli.ts
```

`GITHUB_WORKSPACE` points at the addon repo to bundle (it defaults to the current directory, which is how the composite action invokes it). The CLI prints how many forms and images it bundled and writes the zip to `INPUT_OUT`.

## Testing

```
npm test
npx tsc --noEmit
```

`npm test` runs the vitest suite; CI (`.github/workflows/test.yml`) runs both on every push and pull request.
