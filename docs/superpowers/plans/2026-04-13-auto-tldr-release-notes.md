# Auto-generate TL;DR in release notes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate a `## TL;DR` section at the top of every semantic-release-produced GitHub release body, listing runtime `dependencies` bumps since the previous tag, with per-package links resolved from an override map → `node_modules/<pkg>/package.json` → npmjs.com fallback.

**Architecture:** A local CommonJS semantic-release plugin at `scripts/tldr-plugin.cjs` implements the `generateNotes` lifecycle hook. It diffs `package.json` between the previous git tag and HEAD, renders the TL;DR block, then delegates to `@semantic-release/release-notes-generator` and prepends its own block. `release.config.cjs` is updated to register the local plugin in place of the direct `release-notes-generator` entry.

**Tech Stack:** Node.js ≥24, CommonJS plugin (`.cjs`) inside an ESM project, semantic-release 25, Vitest for unit tests, git CLI for the `git show` call.

**Spec reference:** `docs/superpowers/specs/2026-04-13-auto-tldr-release-notes-design.md`

---

## File Structure

| File                             | Role                                                                                          | Status |
| -------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| `scripts/tldr-plugin.cjs`        | Local semantic-release plugin: helpers + `generateNotes` export + `LINK_OVERRIDES` inline map | Create |
| `tests/unit/tldr-plugin.test.js` | Vitest unit tests for each pure helper                                                        | Create |
| `release.config.cjs`             | Replace `@semantic-release/release-notes-generator` entry with local plugin                   | Modify |

The plugin file is a single CJS module exporting both the public semantic-release hook (`generateNotes`) and the internal helpers (for testing). The helpers are pure functions (no hidden I/O except `resolveLink` which reads `node_modules`), which keeps unit tests fast and deterministic.

---

## Task 1: Scaffold plugin module and lock the public shape

**Files:**

- Create: `scripts/tldr-plugin.cjs`
- Create: `tests/unit/tldr-plugin.test.js`

- [ ] **Step 1: Create the plugin scaffold with placeholder exports**

Create `scripts/tldr-plugin.cjs`:

```js
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const upstream = require("@semantic-release/release-notes-generator");

const LINK_OVERRIDES = {
	dotenv: "https://github.com/motdotla/dotenv/blob/master/CHANGELOG.md",
};

function parseDependencies(pkgJsonString) {
	throw new Error("not implemented");
}

function diffDependencies(prev, next) {
	throw new Error("not implemented");
}

function resolveLink(name, overrides, nodeModulesDir) {
	throw new Error("not implemented");
}

function renderTldr(entries) {
	throw new Error("not implemented");
}

async function buildTldr(context, { nodeModulesDir, cwd } = {}) {
	throw new Error("not implemented");
}

async function generateNotes(pluginConfig, context) {
	throw new Error("not implemented");
}

module.exports = {
	generateNotes,
	// Exported for unit tests:
	parseDependencies,
	diffDependencies,
	resolveLink,
	renderTldr,
	buildTldr,
	LINK_OVERRIDES,
};
```

- [ ] **Step 2: Create the test file scaffold**

Create `tests/unit/tldr-plugin.test.js`:

```js
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tldrPlugin = require("../../scripts/tldr-plugin.cjs");

describe("tldr-plugin scaffold", () => {
	it("exports the expected public surface", () => {
		expect(typeof tldrPlugin.generateNotes).toBe("function");
		expect(typeof tldrPlugin.parseDependencies).toBe("function");
		expect(typeof tldrPlugin.diffDependencies).toBe("function");
		expect(typeof tldrPlugin.resolveLink).toBe("function");
		expect(typeof tldrPlugin.renderTldr).toBe("function");
		expect(typeof tldrPlugin.buildTldr).toBe("function");
		expect(tldrPlugin.LINK_OVERRIDES).toBeTypeOf("object");
	});

	it("ships the dotenv override out of the box", () => {
		expect(tldrPlugin.LINK_OVERRIDES.dotenv).toBe(
			"https://github.com/motdotla/dotenv/blob/master/CHANGELOG.md",
		);
	});
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run tests/unit/tldr-plugin.test.js`

Expected: both tests PASS.

---

## Task 2: `parseDependencies`

**Files:**

- Modify: `scripts/tldr-plugin.cjs` — replace the `parseDependencies` stub
- Modify: `tests/unit/tldr-plugin.test.js` — add tests

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/tldr-plugin.test.js`:

```js
describe("parseDependencies", () => {
	const { parseDependencies } = tldrPlugin;

	it("returns the dependencies map with semver prefixes stripped", () => {
		const input = JSON.stringify({
			dependencies: {
				bullmq: "^5.73.5",
				ioredis: "~5.10.1",
				express: "5.2.1",
			},
		});
		expect(parseDependencies(input)).toEqual({
			bullmq: "5.73.5",
			ioredis: "5.10.1",
			express: "5.2.1",
		});
	});

	it("returns an empty object when the dependencies key is missing", () => {
		expect(parseDependencies(JSON.stringify({ name: "x" }))).toEqual({});
	});

	it("ignores devDependencies entirely", () => {
		const input = JSON.stringify({
			dependencies: { bullmq: "^5.0.0" },
			devDependencies: { vitest: "^4.0.0" },
		});
		expect(parseDependencies(input)).toEqual({ bullmq: "5.0.0" });
	});

	it("throws on malformed JSON", () => {
		expect(() => parseDependencies("{ not json")).toThrow();
	});
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t parseDependencies`

Expected: all 4 fail with "not implemented".

- [ ] **Step 3: Implement `parseDependencies`**

In `scripts/tldr-plugin.cjs`, replace the stub with:

```js
function parseDependencies(pkgJsonString) {
	const parsed = JSON.parse(pkgJsonString);
	const deps = parsed.dependencies || {};
	const out = {};
	for (const [name, rawVersion] of Object.entries(deps)) {
		out[name] = String(rawVersion).replace(/^[\^~]/, "");
	}
	return out;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t parseDependencies`

Expected: 4 PASS.

---

## Task 3: `diffDependencies`

**Files:**

- Modify: `scripts/tldr-plugin.cjs`
- Modify: `tests/unit/tldr-plugin.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/tldr-plugin.test.js`:

```js
describe("diffDependencies", () => {
	const { diffDependencies } = tldrPlugin;

	it("returns entries where the version changed", () => {
		const prev = { bullmq: "5.73.1", "bull-board": "6.21.0", express: "5.2.1" };
		const next = { bullmq: "5.73.4", "bull-board": "6.21.1", express: "5.2.1" };
		expect(diffDependencies(prev, next)).toEqual([
			{ name: "bullmq", oldVersion: "5.73.1", newVersion: "5.73.4" },
			{ name: "bull-board", oldVersion: "6.21.0", newVersion: "6.21.1" },
		]);
	});

	it("returns an empty list when nothing changed", () => {
		const deps = { bullmq: "5.73.4" };
		expect(diffDependencies(deps, deps)).toEqual([]);
	});

	it("ignores additions and removals (v1 scope)", () => {
		const prev = { bullmq: "5.73.4", removed: "1.0.0" };
		const next = { bullmq: "5.73.4", added: "2.0.0" };
		expect(diffDependencies(prev, next)).toEqual([]);
	});

	it("preserves the iteration order of the next map", () => {
		const prev = { b: "1.0.0", a: "1.0.0" };
		const next = { b: "2.0.0", a: "2.0.0" };
		const result = diffDependencies(prev, next);
		expect(result.map((e) => e.name)).toEqual(["b", "a"]);
	});
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t diffDependencies`

Expected: 4 fail.

- [ ] **Step 3: Implement `diffDependencies`**

Replace the stub in `scripts/tldr-plugin.cjs`:

```js
function diffDependencies(prev, next) {
	const entries = [];
	for (const [name, newVersion] of Object.entries(next)) {
		const oldVersion = prev[name];
		if (oldVersion === undefined) continue; // skip added deps (v1)
		if (oldVersion === newVersion) continue;
		entries.push({ name, oldVersion, newVersion });
	}
	return entries;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t diffDependencies`

Expected: 4 PASS.

---

## Task 4: `resolveLink`

**Files:**

- Modify: `scripts/tldr-plugin.cjs`
- Modify: `tests/unit/tldr-plugin.test.js`

This step needs an on-disk fixture layout to simulate `node_modules/<pkg>/package.json`. We use Vitest's `tmpdir` via `node:os` + `node:fs` for each test, keeping fixtures tiny and local.

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/tldr-plugin.test.js`:

```js
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("resolveLink", () => {
	const { resolveLink } = tldrPlugin;
	let nmDir;

	function writePkg(name, pkg) {
		const dir = join(nmDir, name);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));
	}

	beforeEach(() => {
		nmDir = mkdtempSync(join(tmpdir(), "tldr-nm-"));
	});

	afterEach(() => {
		rmSync(nmDir, { recursive: true, force: true });
	});

	it("uses an override when provided", () => {
		const overrides = { foo: "https://example.com/foo-changelog" };
		expect(resolveLink("foo", overrides, nmDir)).toBe("https://example.com/foo-changelog");
	});

	it("prefers the override over a repo lookup", () => {
		writePkg("foo", { repository: { url: "git+https://github.com/acme/foo.git" } });
		const overrides = { foo: "https://example.com/override" };
		expect(resolveLink("foo", overrides, nmDir)).toBe("https://example.com/override");
	});

	it("normalises git+https URLs to the GitHub releases page", () => {
		writePkg("foo", { repository: { url: "git+https://github.com/acme/foo.git" } });
		expect(resolveLink("foo", {}, nmDir)).toBe("https://github.com/acme/foo/releases");
	});

	it("normalises https URLs to the GitHub releases page", () => {
		writePkg("foo", { repository: { url: "https://github.com/acme/foo.git" } });
		expect(resolveLink("foo", {}, nmDir)).toBe("https://github.com/acme/foo/releases");
	});

	it("normalises git:// URLs to the GitHub releases page", () => {
		writePkg("foo", { repository: { url: "git://github.com/acme/foo.git" } });
		expect(resolveLink("foo", {}, nmDir)).toBe("https://github.com/acme/foo/releases");
	});

	it("handles the github:owner/repo shorthand", () => {
		writePkg("foo", { repository: "github:acme/foo" });
		expect(resolveLink("foo", {}, nmDir)).toBe("https://github.com/acme/foo/releases");
	});

	it("falls back to npmjs.com when repository is non-GitHub", () => {
		writePkg("foo", { repository: { url: "https://gitlab.com/acme/foo.git" } });
		expect(resolveLink("foo", {}, nmDir)).toBe("https://www.npmjs.com/package/foo");
	});

	it("falls back to npmjs.com when the package is absent from node_modules", () => {
		expect(resolveLink("ghost", {}, nmDir)).toBe("https://www.npmjs.com/package/ghost");
	});

	it("falls back to npmjs.com when package.json has no repository field", () => {
		writePkg("foo", { name: "foo" });
		expect(resolveLink("foo", {}, nmDir)).toBe("https://www.npmjs.com/package/foo");
	});
});
```

Also, at the top of the test file, add `beforeEach` and `afterEach` to the vitest import line:

```js
import { beforeEach, afterEach, describe, expect, it } from "vitest";
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t resolveLink`

Expected: 9 fail with "not implemented".

- [ ] **Step 3: Implement `resolveLink`**

Replace the stub in `scripts/tldr-plugin.cjs`:

```js
function normalizeGitHubUrl(raw) {
	if (typeof raw !== "string") return null;

	// github:owner/repo shorthand
	const shorthand = raw.match(/^github:([^/]+)\/(.+?)(?:\.git)?$/);
	if (shorthand) {
		return `https://github.com/${shorthand[1]}/${shorthand[2]}/releases`;
	}

	// git+https://, https://, git:// → github.com/owner/repo
	const match = raw.match(
		/^(?:git\+)?(?:https?|git):\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:[/#?].*)?$/,
	);
	if (match) {
		return `https://github.com/${match[1]}/${match[2]}/releases`;
	}
	return null;
}

function readInstalledPkgJson(name, nodeModulesDir) {
	const pkgPath = path.join(nodeModulesDir, name, "package.json");
	try {
		const raw = fs.readFileSync(pkgPath, "utf8");
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function resolveLink(name, overrides, nodeModulesDir) {
	if (overrides && Object.hasOwn(overrides, name)) {
		return overrides[name];
	}

	const pkg = readInstalledPkgJson(name, nodeModulesDir);
	if (pkg && pkg.repository !== undefined) {
		const repoUrl = typeof pkg.repository === "string" ? pkg.repository : pkg.repository.url;
		const normalized = normalizeGitHubUrl(repoUrl);
		if (normalized) return normalized;
	}

	return `https://www.npmjs.com/package/${name}`;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t resolveLink`

Expected: 9 PASS.

---

## Task 5: `renderTldr`

**Files:**

- Modify: `scripts/tldr-plugin.cjs`
- Modify: `tests/unit/tldr-plugin.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/tldr-plugin.test.js`:

```js
describe("renderTldr", () => {
	const { renderTldr } = tldrPlugin;

	it("renders one line per entry under a ## TL;DR header", () => {
		const entries = [
			{
				name: "bull-board",
				oldVersion: "6.21.0",
				newVersion: "6.21.1",
				url: "https://github.com/felixmosh/bull-board/releases",
			},
			{
				name: "bullmq",
				oldVersion: "5.73.1",
				newVersion: "5.73.4",
				url: "https://www.npmjs.com/package/bullmq",
			},
		];
		expect(renderTldr(entries)).toBe(
			[
				"## TL;DR",
				"- Update [bull-board](https://github.com/felixmosh/bull-board/releases) 6.21.0 to 6.21.1",
				"- Update [bullmq](https://www.npmjs.com/package/bullmq) 5.73.1 to 5.73.4",
			].join("\n"),
		);
	});

	it("returns an empty string when entries is empty", () => {
		expect(renderTldr([])).toBe("");
	});
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t renderTldr`

Expected: 2 fail.

- [ ] **Step 3: Implement `renderTldr`**

Replace the stub in `scripts/tldr-plugin.cjs`:

```js
function renderTldr(entries) {
	if (entries.length === 0) return "";
	const lines = ["## TL;DR"];
	for (const { name, oldVersion, newVersion, url } of entries) {
		lines.push(`- Update [${name}](${url}) ${oldVersion} to ${newVersion}`);
	}
	return lines.join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t renderTldr`

Expected: 2 PASS.

---

## Task 6: `buildTldr` — glue helpers + git

**Files:**

- Modify: `scripts/tldr-plugin.cjs`
- Modify: `tests/unit/tldr-plugin.test.js`

`buildTldr` needs to read the previous `package.json` via `git show <tag>:package.json` and the current one from disk. For testability, accept `cwd` and `nodeModulesDir` as options and allow a `gitShow` override for unit tests.

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/tldr-plugin.test.js`:

```js
describe("buildTldr", () => {
	const { buildTldr } = tldrPlugin;
	let tmp;
	let nmDir;

	beforeEach(() => {
		tmp = mkdtempSync(join(tmpdir(), "tldr-build-"));
		nmDir = join(tmp, "node_modules");
		mkdirSync(nmDir);
	});

	afterEach(() => {
		rmSync(tmp, { recursive: true, force: true });
	});

	function writeCurrentPkg(deps) {
		writeFileSync(join(tmp, "package.json"), JSON.stringify({ dependencies: deps }));
	}

	it("returns an empty string when there is no previous tag", async () => {
		writeCurrentPkg({ bullmq: "5.73.4" });
		const context = { lastRelease: {} };
		const result = await buildTldr(context, {
			cwd: tmp,
			nodeModulesDir: nmDir,
			gitShow: () => {
				throw new Error("should not be called");
			},
		});
		expect(result).toBe("");
	});

	it("returns an empty string when dependencies are unchanged", async () => {
		writeCurrentPkg({ bullmq: "5.73.4" });
		const context = { lastRelease: { gitTag: "v1.0.0" } };
		const result = await buildTldr(context, {
			cwd: tmp,
			nodeModulesDir: nmDir,
			gitShow: () => JSON.stringify({ dependencies: { bullmq: "^5.73.4" } }),
		});
		expect(result).toBe("");
	});

	it("renders the TL;DR block for dependency updates with resolved links", async () => {
		// Write a fake installed package.json for bull-board with a github repo URL
		mkdirSync(join(nmDir, "bull-board"), { recursive: true });
		writeFileSync(
			join(nmDir, "bull-board", "package.json"),
			JSON.stringify({ repository: { url: "git+https://github.com/felixmosh/bull-board.git" } }),
		);
		// bullmq is intentionally absent → falls back to npmjs.com

		writeCurrentPkg({ "bull-board": "^6.21.1", bullmq: "^5.73.4" });
		const context = { lastRelease: { gitTag: "v3.3.3" } };
		const result = await buildTldr(context, {
			cwd: tmp,
			nodeModulesDir: nmDir,
			gitShow: (tag) => {
				expect(tag).toBe("v3.3.3");
				return JSON.stringify({
					dependencies: { "bull-board": "^6.21.0", bullmq: "^5.73.1" },
				});
			},
		});
		expect(result).toBe(
			[
				"## TL;DR",
				"- Update [bull-board](https://github.com/felixmosh/bull-board/releases) 6.21.0 to 6.21.1",
				"- Update [bullmq](https://www.npmjs.com/package/bullmq) 5.73.1 to 5.73.4",
			].join("\n"),
		);
	});

	it("propagates gitShow errors", async () => {
		writeCurrentPkg({ bullmq: "5.73.4" });
		const context = { lastRelease: { gitTag: "v1.0.0" } };
		await expect(
			buildTldr(context, {
				cwd: tmp,
				nodeModulesDir: nmDir,
				gitShow: () => {
					throw new Error("git exploded");
				},
			}),
		).rejects.toThrow("git exploded");
	});
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t buildTldr`

Expected: 4 fail.

- [ ] **Step 3: Implement `buildTldr`**

Replace the stub in `scripts/tldr-plugin.cjs`:

```js
function defaultGitShow(tag, cwd) {
	return execFileSync("git", ["show", `${tag}:package.json`], {
		cwd,
		encoding: "utf8",
	});
}

async function buildTldr(context, options = {}) {
	const cwd = options.cwd || context.cwd || process.cwd();
	const nodeModulesDir = options.nodeModulesDir || path.join(cwd, "node_modules");
	const gitShow = options.gitShow || ((tag) => defaultGitShow(tag, cwd));

	const lastTag = context.lastRelease && context.lastRelease.gitTag;
	if (!lastTag) return "";

	const prevRaw = gitShow(lastTag);
	const nextRaw = fs.readFileSync(path.join(cwd, "package.json"), "utf8");

	const prev = parseDependencies(prevRaw);
	const next = parseDependencies(nextRaw);
	const diff = diffDependencies(prev, next);
	if (diff.length === 0) return "";

	const enriched = diff.map((entry) => ({
		...entry,
		url: resolveLink(entry.name, LINK_OVERRIDES, nodeModulesDir),
	}));
	return renderTldr(enriched);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t buildTldr`

Expected: 4 PASS.

---

## Task 7: `generateNotes` — wrap upstream

**Files:**

- Modify: `scripts/tldr-plugin.cjs`
- Modify: `tests/unit/tldr-plugin.test.js`

`generateNotes` must call `@semantic-release/release-notes-generator` to produce the standard changelog, then prepend the TL;DR. For unit tests we stub both `buildTldr` and the upstream call by providing them as options; we also test the production code path by spying on the module.

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/tldr-plugin.test.js`:

```js
describe("generateNotes", () => {
	const { generateNotes } = tldrPlugin;

	it("prepends the TL;DR block when one is generated", async () => {
		const pluginConfig = { preset: "conventionalcommits" };
		const context = {
			lastRelease: { gitTag: "v1.0.0" },
			nextRelease: { version: "1.1.0" },
		};
		const result = await generateNotes(pluginConfig, context, {
			buildTldr: async () => "## TL;DR\n- Update [foo](https://example.com) 1 to 2",
			upstreamGenerateNotes: async () => "## Changes\n- commit 1",
		});
		expect(result).toBe(
			"## TL;DR\n- Update [foo](https://example.com) 1 to 2\n\n## Changes\n- commit 1",
		);
	});

	it("returns only upstream notes when the TL;DR block is empty", async () => {
		const pluginConfig = { preset: "conventionalcommits" };
		const context = { lastRelease: {}, nextRelease: { version: "1.0.0" } };
		const result = await generateNotes(pluginConfig, context, {
			buildTldr: async () => "",
			upstreamGenerateNotes: async () => "## Changes\n- initial commit",
		});
		expect(result).toBe("## Changes\n- initial commit");
	});

	it("forwards pluginConfig and context to the upstream generator", async () => {
		const pluginConfig = { preset: "conventionalcommits", foo: "bar" };
		const context = { lastRelease: {}, nextRelease: { version: "1.0.0" } };
		let received;
		await generateNotes(pluginConfig, context, {
			buildTldr: async () => "",
			upstreamGenerateNotes: async (cfg, ctx) => {
				received = { cfg, ctx };
				return "";
			},
		});
		expect(received.cfg).toBe(pluginConfig);
		expect(received.ctx).toBe(context);
	});
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t generateNotes`

Expected: 3 fail.

- [ ] **Step 3: Implement `generateNotes`**

Replace the stub in `scripts/tldr-plugin.cjs`:

```js
async function generateNotes(pluginConfig, context, options = {}) {
	const build = options.buildTldr || ((ctx) => buildTldr(ctx));
	const upstreamFn = options.upstreamGenerateNotes || upstream.generateNotes;

	const tldr = await build(context);
	const upstreamNotes = await upstreamFn(pluginConfig, context);

	if (!tldr) return upstreamNotes;
	return `${tldr}\n\n${upstreamNotes}`;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/tldr-plugin.test.js -t generateNotes`

Expected: 3 PASS.

- [ ] **Step 5: Run the full test file**

Run: `npx vitest run tests/unit/tldr-plugin.test.js`

Expected: all tests PASS (scaffold + parseDependencies + diffDependencies + resolveLink + renderTldr + buildTldr + generateNotes).

---

## Task 8: Wire the plugin into `release.config.cjs`

**Files:**

- Modify: `release.config.cjs`

- [ ] **Step 1: Swap the plugin entry**

In `release.config.cjs`, find this line:

```js
["@semantic-release/release-notes-generator", { preset: "conventionalcommits" }],
```

Replace it with:

```js
["./scripts/tldr-plugin.cjs", { preset: "conventionalcommits" }],
```

The resulting `plugins` array is:

```js
plugins: [
	[
		"@semantic-release/commit-analyzer",
		{
			/* unchanged */
		},
	],
	["./scripts/tldr-plugin.cjs", { preset: "conventionalcommits" }],
	// '@semantic-release/git',
	"@semantic-release/github",
],
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: all tests PASS (existing + new `tldr-plugin` tests).

---

## Task 9: Dry-run validation against real repo state

**Files:** no code changes

- [ ] **Step 1: Run semantic-release in dry-run mode**

Run: `npx semantic-release --dry-run --no-ci -b master`

Expected: the command prints the release notes that _would_ be published. Scan the output for:

- A `## TL;DR` block appears near the top.
- It lists the runtime-dependency updates currently pending on `master` (from commit `c6714df`: bull-board 6.21.1 → 6.21.2, bullmq 5.73.4 → 5.73.5, dotenv 17.4.1 → 17.4.2). Any non-runtime deps (oxlint, oxfmt, vitest, etc.) must NOT appear.
- Each entry has a link: `bull-board` → `https://github.com/felixmosh/bull-board/releases`, `bullmq` → GitHub releases or npm depending on its `repository.url`, `dotenv` → the CHANGELOG override URL.
- Below the TL;DR, the standard semantic-release changelog sections are still present.

- [ ] **Step 2: If any discrepancy — fix forward**

If a link is wrong, add or adjust an entry in `LINK_OVERRIDES`. If a dep is missing or extra, re-verify `parseDependencies` and `diffDependencies` against the dry-run context. No commit until the dry-run output matches expectations.

---

## Task 10: Final verification & handover

**Files:** no code changes

- [ ] **Step 1: Run tests + lint + format checks**

Run: `npm test && npm run lint && npm run format`

Expected: all green.

- [ ] **Step 2: Summarize the diff for review**

Run: `git status && git diff --stat`

Expected files changed:

- `scripts/tldr-plugin.cjs` (added)
- `tests/unit/tldr-plugin.test.js` (added)
- `release.config.cjs` (modified — one line swapped)
- `docs/superpowers/specs/2026-04-13-auto-tldr-release-notes-design.md` (added during brainstorming)
- `docs/superpowers/plans/2026-04-13-auto-tldr-release-notes.md` (added during planning)

- [ ] **Step 3: Hand off to user for the single commit to `master`**

Per the user's instruction, DO NOT commit autonomously. Present the diff summary and wait for explicit approval on the commit message + commit + merge-to-master sequence.

---

## Self-Review Notes

- **Spec coverage**: every section of the spec maps to at least one task:
  - `parseDependencies` → Task 2
  - `diffDependencies` → Task 3
  - `resolveLink` + `LINK_OVERRIDES` → Task 4 (+ Task 1 initial map)
  - `renderTldr` → Task 5
  - `buildTldr` (algorithm + edge cases) → Task 6 (no-tag, no-change, error propagation)
  - `generateNotes` wrapping upstream → Task 7
  - `release.config.cjs` swap → Task 8
  - Integration smoke test (`npx semantic-release --dry-run`) → Task 9
  - Final verification → Task 10
- **Placeholders**: scanned — none remaining. All tasks contain complete code.
- **Type/signature consistency**:
  - `parseDependencies(string) → object<string, string>` — used identically in Task 6.
  - `diffDependencies(prev, next) → Array<{name, oldVersion, newVersion}>` — Task 6 maps over this and adds `url`.
  - `resolveLink(name, overrides, nodeModulesDir) → string` — signature matches in Task 4 and Task 6.
  - `renderTldr(entries) → string` — entries in Task 5 include `url`; Task 6 produces entries with `url`.
  - `buildTldr(context, options)` — signature matches between Tasks 6 and 7.
  - `generateNotes(pluginConfig, context, options)` — the third optional `options` arg is for tests only; semantic-release calls with two args. Confirmed.
- **Scope**: single-plan-sized, no decomposition needed.
