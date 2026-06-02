# Auto-generate TL;DR section in GitHub release notes

**Date**: 2026-04-13
**Status**: Design approved, ready for implementation plan

## Problem

The repo publishes releases via `semantic-release`. The default `@semantic-release/release-notes-generator` output does not match the format the maintainer manually applies on GitHub: a `## TL;DR` section listing the `dependencies` bumps in a friendly one-line-per-package form, with custom links to each package's release/changelog page.

Today the maintainer edits every release by hand on GitHub to insert this block. This is repetitive and error-prone.

## Goal

Automate the generation of the `## TL;DR` section so that semantic-release publishes a release body that already contains the maintainer's preferred format, with zero manual edit.

## Non-goals

- Changing the current versioning rules in `release.config.cjs`.
- Touching `devDependencies` — only runtime `dependencies` are listed in the TL;DR.
- Handling added or removed deps in v1 (100% of historical TL;DRs only cover updates). This can be extended later.
- Replacing or restyling the rest of the release body — the standard semantic-release changelog continues to render below the TL;DR.

## Target output format

Matches the format used today on releases like v3.3.2 and v3.3.4:

```markdown
## [3.3.4](https://github.com/Venatum/bull-board-docker/compare/v3.3.3...v3.3.4) (2026-04-12)

## TL;DR

- Update [bull-board](https://github.com/felixmosh/bull-board/releases) 6.21.0 to 6.21.1
- Update [bullmq](https://www.npmjs.com/package/bullmq) 5.73.1 to 5.73.4

<remaining auto-generated changelog sections>

**Full Changelog**: https://github.com/Venatum/bull-board-docker/compare/v3.3.3...v3.3.4
```

When no `dependencies` changed since the previous tag, the TL;DR section is omitted entirely (matches v3.3.0).

## Architecture

### Components

1. **`scripts/tldr-plugin.cjs`** — a local semantic-release plugin (~80-100 LOC), self-contained: contains the diff logic, the link resolver, the renderer, and the `LINK_OVERRIDES` map.

2. **`release.config.cjs`** — updated to replace the `@semantic-release/release-notes-generator` entry with the local plugin. The local plugin wraps the upstream generator internally.

### Integration with semantic-release

The plugin implements the `generateNotes` lifecycle hook. Signature:

```js
// scripts/tldr-plugin.cjs
module.exports = {
	generateNotes: async (pluginConfig, context) => {
		const tldr = await buildTldr(context);
		const upstreamNotes = await upstreamGenerator.generateNotes(pluginConfig, context);
		return tldr ? `${tldr}\n\n${upstreamNotes}` : upstreamNotes;
	},
};
```

`upstreamGenerator` is `require('@semantic-release/release-notes-generator')`. The `pluginConfig` passed through is the same `{ preset: "conventionalcommits" }` used today.

In `release.config.cjs`, the plugin list becomes:

```js
plugins: [
	[
		"@semantic-release/commit-analyzer",
		{
			/* unchanged */
		},
	],
	["./scripts/tldr-plugin.cjs", { preset: "conventionalcommits" }],
	"@semantic-release/github",
];
```

### Algorithm (`buildTldr(context)`)

1. If `context.lastRelease.gitTag` is falsy → return empty string (first release, no diff).
2. Read the previous `package.json` via `git show <lastRelease.gitTag>:package.json`.
3. Read the current `package.json` from disk (`./package.json`).
4. Parse both JSON blobs and extract the `dependencies` map from each.
5. Normalize versions: strip leading `^` and `~`.
6. Build a diff list: `{ name, oldVersion, newVersion }` for every key whose version differs. Skip keys that are only in one side (added/removed) in v1.
7. If the diff list is empty → return empty string.
8. For each entry, resolve the link (see "Link resolution").
9. Render:
   ```
   ## TL;DR
   - Update [<name>](<url>) <oldVersion> to <newVersion>
   ...
   ```
10. Return the rendered block.

### Link resolution

Function `resolveLink(name)`, evaluated in order:

1. **Override**: if `LINK_OVERRIDES[name]` exists, return it.
2. **GitHub repo from node_modules**: read `node_modules/<name>/package.json`, extract `repository.url` (supports both the string shorthand and the object form), normalize git URLs to `https://github.com/<owner>/<repo>/releases`. Accepts these shapes:
   - `git+https://github.com/owner/repo.git`
   - `https://github.com/owner/repo.git`
   - `git://github.com/owner/repo.git`
   - `github:owner/repo`
3. **Fallback**: `https://www.npmjs.com/package/<name>`.

`LINK_OVERRIDES` is an inline `const` in `scripts/tldr-plugin.cjs`:

```js
const LINK_OVERRIDES = {
	dotenv: "https://github.com/motdotla/dotenv/blob/master/CHANGELOG.md",
};
```

New overrides are added by editing this constant.

### Data flow

```
semantic-release pipeline
  └─ commit-analyzer decides nextRelease version
  └─ tldr-plugin.generateNotes(pluginConfig, context)
       ├─ buildTldr(context)
       │    ├─ git show <lastTag>:package.json → prev deps
       │    ├─ read ./package.json → current deps
       │    ├─ diff → [{ name, oldVersion, newVersion }]
       │    ├─ for each entry → resolveLink(name)
       │    └─ render markdown
       ├─ upstreamGenerator.generateNotes() → standard changelog
       └─ return `${tldr}\n\n${upstream}` (or just upstream if no diff)
  └─ @semantic-release/github publishes with the combined body
```

## Edge cases

- **First release (no previous tag)**: `context.lastRelease.gitTag` is falsy → skip TL;DR, delegate entirely to upstream.
- **Shallow git history**: `git show <tag>:package.json` fails. Mitigation: the `release.yml` workflow already uses `fetch-depth: 0`. If the command fails for any reason, the plugin throws — fail loudly rather than publish an incomplete release.
- **Package absent from `node_modules`**: `require`/`readFileSync` throws. Catch and fall through to the npmjs.com fallback.
- **Malformed `repository.url`** (unknown host, weird format): skip step 2 and fall through to npmjs.com.
- **`dependencies` key missing in either `package.json`**: treat as `{}`.
- **Added or removed deps**: ignored in v1. They still appear in the standard semantic-release changelog below via the commit-analyzer's "Dependency updates" section. A future iteration can add "Add [pkg](url) vX.Y.Z" and "Remove [pkg]" lines.

## Testing

### Unit tests (`tests/unit/tldr-plugin.test.js`, Vitest)

- `parseDependencies(pkgJsonString)`:
  - strips `^` and `~` prefixes
  - returns `{}` when `dependencies` is absent
  - handles malformed JSON by throwing
- `diffDependencies(prev, next)`:
  - returns only entries where version changed
  - ignores added/removed in v1
  - returns `[]` when nothing changed
- `resolveLink(name, overrides, nodeModulesDir)`:
  - override wins over any repo lookup
  - reads `node_modules/<name>/package.json` and normalizes `git+https://...git` → `.../releases`
  - handles `repository` as string shorthand (`"github:owner/repo"`)
  - falls back to npmjs.com when `node_modules/<name>/package.json` is missing
  - falls back to npmjs.com when `repository.url` is a non-github URL
- `renderTldr(entries)`:
  - renders one `- Update [name](url) old to new` line per entry
  - prefixes with `## TL;DR\n`
  - returns empty string when entries is empty

### Integration smoke-test

Run `npx semantic-release --dry-run` on a local branch with a synthetic dep bump commit; assert the dry-run output contains the `## TL;DR` block.

## Files touched

- **Added**: `scripts/tldr-plugin.cjs`
- **Added**: `tests/unit/tldr-plugin.test.js`
- **Modified**: `release.config.cjs` (swap one plugin entry)

No changes to `.github/workflows/release.yml` — `fetch-depth: 0` is already set.

## Rollout

1. Implement plugin and tests on a feature branch.
2. Verify via `npx semantic-release --dry-run` that generated notes include the expected TL;DR for the current unreleased commits.
3. Merge to `master`. The next release published by the workflow will include the TL;DR automatically.
4. First real release acts as the acceptance test. If the format is off, fix forward.
