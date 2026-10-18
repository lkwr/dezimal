// Measures the bundled JavaScript size of the bare core (`dist/index.js`) and
// every preset (`dist/preset/*.js`) with rolldown, based on the files as built
// by `node build.ts` — run the build first. Bundles are generated in memory
// only — the script reads the dist output and writes nothing to disk.
//
// Presets are measured the way consumers use them: the core export plus a
// side-effect import of the preset in one chunk (a virtual entry module).
// Every build asserts that the core is part of its bundle.
//
// Usage: node scripts/bundle-size.ts

import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { type Plugin, rolldown } from "rolldown";

const root = resolve(import.meta.dirname, "..");
const distDir = resolve(root, "dist");
const coreEntry = resolve(distDir, "index.js");

if (!existsSync(coreEntry)) {
	throw new Error("dist/index.js not found — run `node build.ts` first");
}

// The core class lives in a hashed chunk named after src/decimal.ts.
const decimalChunkName = readdirSync(distDir).find((name) =>
	/^decimal-.*\.js$/.test(name),
);
if (!decimalChunkName) {
	throw new Error("dist/decimal-*.js not found — run `node build.ts` first");
}
const decimalCore = resolve(distDir, decimalChunkName);

const presets = readdirSync(resolve(distDir, "preset"))
	.filter((name) => name.endsWith(".js"))
	.map((name) => name.replace(/\.js$/, ""))
	.sort();

const VIRTUAL_ID = "\0dezimal-preset-entry";

function presetEntryPlugin(presetFile: string): Plugin {
	return {
		name: "dezimal-bundle-size",
		resolveId(source) {
			if (source === VIRTUAL_ID) {
				return VIRTUAL_ID;
			}
		},
		load(id) {
			if (id === VIRTUAL_ID) {
				return [
					`export { Decimal } from ${JSON.stringify(coreEntry)};`,
					`import ${JSON.stringify(presetFile)};`,
				].join("\n");
			}
		},
	};
}

type Entry = {
	preset: string;
	input: string;
	plugins: Plugin[];
};

const entries: Entry[] = [
	{ preset: "none", input: coreEntry, plugins: [] },
	...presets.map((preset) => ({
		preset,
		input: VIRTUAL_ID,
		plugins: [presetEntryPlugin(resolve(distDir, "preset", `${preset}.js`))],
	})),
];

async function bundleCode(
	entry: Entry,
	minify: boolean,
): Promise<{
	code: string;
	includesCore: boolean;
}> {
	const bundle = await rolldown({
		input: entry.input,
		platform: "neutral",
		plugins: entry.plugins,
	});
	try {
		const { output } = await bundle.generate({ format: "esm", minify });
		let code = "";
		let includesCore = false;
		for (const item of output) {
			if (item.type === "chunk") {
				code += item.code;
				includesCore ||= item.moduleIds.includes(decimalCore);
			}
		}
		return { code, includesCore };
	} finally {
		await bundle.close();
	}
}

async function measure(entry: Entry): Promise<{
	raw: number;
	min: number;
	minGzip: number;
}> {
	const [raw, min] = await Promise.all([
		bundleCode(entry, false),
		bundleCode(entry, true),
	]);
	for (const result of [raw, min]) {
		if (!result.includesCore) {
			throw new Error(
				`core (dist/${decimalChunkName}) is not part of the bundle for ${entry.preset}`,
			);
		}
	}
	return {
		raw: Buffer.byteLength(raw.code),
		min: Buffer.byteLength(min.code),
		minGzip: gzipSync(min.code).byteLength,
	};
}

type Row = {
	preset: string;
	raw: number;
	min: number;
	minGzip: number;
};

// Basic ANSI styles; disabled when output is not a terminal.
const styled = (style: string, text: string): string =>
	process.stdout.isTTY ? `\x1B[${style}m${text}\x1B[22m` : text;
const bold = (text: string): string => styled("1", text);
const dim = (text: string): string => styled("2", text);

const toKb = (value: number): string => (value / 1000).toFixed(2);

const rows: Row[] = [];
for (const entry of entries) {
	const sizes = await measure(entry);
	rows.push({
		preset: entry.preset,
		raw: sizes.raw,
		min: sizes.min,
		minGzip: sizes.minGzip,
	});
}

const presetWidth = Math.max(
	"preset".length,
	...rows.map((row) => row.preset.length),
);
const numberWidth = Math.max(
	"min+gzip".length,
	...rows.flatMap((row) => [
		toKb(row.raw).length,
		toKb(row.min).length,
		toKb(row.minGzip).length,
	]),
);
const gap = "  ";
const header = [
	bold("preset".padEnd(presetWidth)),
	bold("raw".padStart(numberWidth)),
	bold("min".padStart(numberWidth)),
	bold("min+gzip".padStart(numberWidth)),
].join(gap);
const line = (row: Row) =>
	[
		row.preset.padEnd(presetWidth),
		toKb(row.raw).padStart(numberWidth),
		toKb(row.min).padStart(numberWidth),
		toKb(row.minGzip).padStart(numberWidth),
	].join(gap);

console.log(
	bold("dezimal bundle size") +
		" " +
		dim("(rolldown, esm, platform neutral; kB = 1000 bytes)"),
);
console.log("");
console.log(header);
for (const row of rows) {
	console.log(row.preset === "none" ? dim(line(row)) : line(row));
}
console.log("");
console.log(dim("presets = core + preset side-effect import (consumer usage)"));
