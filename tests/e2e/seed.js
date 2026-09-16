#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generator = join(__dirname, "..", "job-generator.js");

// Each scenario seeds jobs under its own BULL_PREFIX so every container's
// discovery (scan of `${BULL_PREFIX}:*`) is isolated on the shared Redis.
const scenarios = [
	{ name: "smoke", args: ["--all"] },
	{ name: "auth", args: ["--all", "--prefix", "authq"] },
	{ name: "proxy", args: ["--all", "--prefix", "proxyq"] },
	{ name: "prefix", args: ["--all", "--prefix", "myapp", "--queue", "prefixed-queue"] },
	{
		name: "version",
		args: ["--all", "--version", "bull", "--prefix", "bullv", "--queue", "bull-queue"],
	},
];

const env = {
	...process.env,
	REDIS_HOST: process.env.REDIS_HOST || "localhost",
	REDIS_PORT: process.env.REDIS_PORT || "6379",
};

let failed = false;
for (const { name, args } of scenarios) {
	console.log(`\n🌱 Seeding scenario "${name}": job-generator ${args.join(" ")}`);
	const res = spawnSync(process.execPath, [generator, ...args], { stdio: "inherit", env });
	if (res.status !== 0) {
		console.error(`❌ Seed failed for scenario "${name}" (exit ${res.status})`);
		if (res.error) console.error(res.error.message);
		failed = true;
	}
}

if (failed) {
	console.error("\n❌ Seeding completed with errors");
	process.exit(1);
}
console.log("\n✅ All scenarios seeded");
