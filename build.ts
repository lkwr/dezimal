import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "tsdown";

const path = (path: string) => resolve(import.meta.dirname, path);

await rm(path("./dist"), { force: true, recursive: true });
await mkdir(path("./dist"));

const packageJson = {
	name: "dezi",
};

await writeFile("./dist/package.json", JSON.stringify(packageJson, null, 2));

await build({
	entry: {
		index: "src/index.ts",
		"extensions/*": "src/extensions/*.ts",
	},
	outDir: "dist",
	dts: true,
	clean: true,
	format: "esm",
	platform: "neutral",
});
