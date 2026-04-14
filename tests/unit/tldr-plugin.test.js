import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

	it("handles the bare owner/repo npm shorthand", () => {
		writePkg("foo", { repository: "acme/foo" });
		expect(resolveLink("foo", {}, nmDir)).toBe("https://github.com/acme/foo/releases");
	});

	it("throws when a package.json in node_modules is malformed", () => {
		const dir = join(nmDir, "bad");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "package.json"), "{ not json");
		expect(() => resolveLink("bad", {}, nmDir)).toThrow();
	});
});

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
		mkdirSync(join(nmDir, "bull-board"), { recursive: true });
		writeFileSync(
			join(nmDir, "bull-board", "package.json"),
			JSON.stringify({ repository: { url: "git+https://github.com/felixmosh/bull-board.git" } }),
		);

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
				"- Update [bullmq](https://github.com/taskforcesh/bullmq/releases) 5.73.1 to 5.73.4",
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

describe("generateNotes", () => {
	const { generateNotes } = tldrPlugin;

	it("injects the TL;DR block after the version header", async () => {
		const pluginConfig = { preset: "conventionalcommits" };
		const context = {
			lastRelease: { gitTag: "v1.0.0" },
			nextRelease: { version: "1.1.0" },
		};
		const result = await generateNotes(pluginConfig, context, {
			buildTldr: async () => "## TL;DR\n- Update [foo](https://example.com) 1 to 2",
			upstreamGenerateNotes: async () =>
				"## [1.1.0](https://github.com/test/repo/compare/v1.0.0...v1.1.0) (2026-04-13)\n\n### Dependency updates\n\n* bump foo",
		});
		expect(result).toBe(
			[
				"## [1.1.0](https://github.com/test/repo/compare/v1.0.0...v1.1.0) (2026-04-13)",
				"",
				"## TL;DR",
				"- Update [foo](https://example.com) 1 to 2",
				"",
				"### Dependency updates",
				"",
				"* bump foo",
			].join("\n"),
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
