import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

const path = (path: string) => resolve(import.meta.dirname, path);

await rm(path("./dist"), { force: true, recursive: true });
await mkdir(path("./dist"));

const distPackageJson = {
	name: packageJson.name,
	version: packageJson.version,
	description: packageJson.description,
	keywords: packageJson.keywords,
	author: packageJson.author,
	license: packageJson.license,
	repository: packageJson.repository,
	homepage: packageJson.homepage,
	bugs: packageJson.bugs,

	type: packageJson.type,
	// Fallback for resolvers without `exports` support (TypeScript's legacy
	// "node" resolution); subpaths resolve as plain files there.
	main: "./index.js",
	types: "./index.d.ts",
	exports: {
		".": "./index.js",
		"./ops/*": "./ops/*.js",
		"./check/*": "./check/*.js",
		"./format/*": "./format/*.js",
		"./config/*": "./config/*.js",
		"./preset/*": "./preset/*.js",
	},
	// Deliberately no `sideEffects: false`: extensions register themselves on
	// import, so bundlers must keep every imported module.
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
	path("./dist/package.json"),
	`${JSON.stringify(distPackageJson, null, 2)}\n`,
);

for (const file of ["README.md", "LICENSE"]) {
	await copyFile(path(file), path(`./dist/${file}`));
}
