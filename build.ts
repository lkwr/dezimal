import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

const path = (path: string) => resolve(import.meta.dirname, path);

await rm(path("./dist"), { force: true, recursive: true });
await mkdir(path("./dist"));

const distPackageJson = {
	name: packageJson.name,
	version: packageJson.version,
	type: packageJson.type,
	author: packageJson.author,
	license: packageJson.license,

	exports: {
		".": "./index.js",
		"./ops/*": "./ops/*.js",
		"./check/*": "./check/*.js",
		"./format/*": "./format/*.js",
		"./config/*": "./config/*.js",
		"./preset/*": "./preset/*.js",
	},
};

await build({
	entry: {
		index: "./src/index.ts",
		"ops/*": "./src/ops/*.ts",
		"check/*": "./src/check/*.ts",
		"format/*": "./src/format/*.ts",
		"config/*": "./src/config/*.ts",
		"preset/*": "./src/preset/*.ts",
	},
	dts: true,
	format: "esm",
	platform: "neutral",
	minify: { compress: true, mangle: { keepNames: true } },
	outDir: path("./dist"),
});

await writeFile(
	"./dist/package.json",
	JSON.stringify(distPackageJson, null, 2),
);
