"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const upstream = require("@semantic-release/release-notes-generator");

const LINK_OVERRIDES = {
	"@bull-board/api": "https://github.com/felixmosh/bull-board/releases",
	"@bull-board/express": "https://github.com/felixmosh/bull-board/releases",
	bullmq: "https://github.com/taskforcesh/bullmq/releases",
	dotenv: "https://github.com/motdotla/dotenv/blob/master/CHANGELOG.md",
	ioredis: "https://github.com/redis/ioredis/releases",
};

function parseDependencies(pkgJsonString) {
	const parsed = JSON.parse(pkgJsonString);
	const deps = parsed.dependencies || {};
	const out = {};
	for (const [name, rawVersion] of Object.entries(deps)) {
		out[name] = String(rawVersion).replace(/^[\^~]/, "");
	}
	return out;
}

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

	// bare owner/repo shorthand (npm convention, equivalent to github:owner/repo)
	const bare = raw.match(/^([^/:@][^/]*)\/([^/]+?)(?:\.git)?$/);
	if (bare) {
		return `https://github.com/${bare[1]}/${bare[2]}/releases`;
	}

	return null;
}

function readInstalledPkgJson(name, nodeModulesDir) {
	const pkgPath = path.join(nodeModulesDir, name, "package.json");
	let raw;
	try {
		raw = fs.readFileSync(pkgPath, "utf8");
	} catch {
		return null; // package not installed → caller falls back to npmjs.com
	}
	return JSON.parse(raw); // let malformed JSON throw loudly
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

function renderTldr(entries) {
	if (entries.length === 0) return "";
	const lines = ["## TL;DR"];
	for (const { name, oldVersion, newVersion, url } of entries) {
		lines.push(`- Update [${name}](${url}) ${oldVersion} to ${newVersion}`);
	}
	return lines.join("\n");
}

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

async function generateNotes(pluginConfig, context, options = {}) {
	const build = options.buildTldr || ((ctx) => buildTldr(ctx));
	const upstreamFn = options.upstreamGenerateNotes || upstream.generateNotes;

	const tldr = await build(context);
	const upstreamNotes = await upstreamFn(pluginConfig, context);

	if (!tldr) return upstreamNotes;

	// Inject the TL;DR between the version header (first line) and the rest,
	// so the release body reads: header → TL;DR → auto-generated changelog.
	const firstNewline = upstreamNotes.indexOf("\n");
	if (firstNewline === -1) {
		return `${upstreamNotes}\n\n${tldr}`;
	}
	const header = upstreamNotes.slice(0, firstNewline);
	const rest = upstreamNotes.slice(firstNewline + 1).replace(/^\n+/, "");
	return `${header}\n\n${tldr}\n\n${rest}`;
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
