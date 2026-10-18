// Installs the built package (`dist/`) into a throwaway project and checks it
// the way a consumer sees it, through package self-reference instead of the
// repo's tsconfig paths. Run the build first.
//
// 1. Every subpath export is typechecked on its own, next to the root
//    import every consumer has: augmentations are global, so a declaration
//    that only resolves because some other extension happens to be loaded
//    passes in a combined program but breaks a consumer importing that one
//    extension.
// 2. A usage fixture typechecks (including that non-imported extensions are
//    rejected) and runs under plain Node.
//
// Usage: node scripts/check-consumer.ts

import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const distDir = resolve(root, "dist");

if (!existsSync(resolve(distDir, "package.json"))) {
	throw new Error("dist/package.json not found — run `node build.ts` first");
}

const options: ts.CompilerOptions = {
	strict: true,
	module: ts.ModuleKind.NodeNext,
	moduleResolution: ts.ModuleResolutionKind.NodeNext,
	target: ts.ScriptTarget.ES2022,
	noEmit: true,
	verbatimModuleSyntax: true,
	skipDefaultLibCheck: true,
	types: [],
};

const fixture = `
import assert from "node:assert/strict";
import { Decimal, type DecimalLike } from "dezi";
import type { PrecisionOptions, RoundingMode } from "dezi";
import "dezi/preset/basic";
import "dezi/ops/sqrt";

const rounding: RoundingMode = "down";
const options: PrecisionOptions = { precision: 5, rounding };
const input: DecimalLike = "0.1";
const sum = new Decimal(input).plus("0.2");

assert.equal(sum.toString(), "0.3");
assert.equal(\`\${sum}\`, "0.3");
assert.equal(new Decimal(2).sqrt(options).toString(), "1.4142");
assert.equal(Decimal.max(1, 3, 2).toString(), "3");
assert.throws(() => +sum, TypeError);

// Extensions that were not imported must not typecheck.
export const notImported = () => {
	// @ts-expect-error ln is not imported
	sum.ln();
	// @ts-expect-error toJSON is not imported
	sum.toJSON();
};
`;

// One host for all programs, so lib and dist declarations are parsed once.
const host = ts.createCompilerHost(options);
const sourceFiles = new Map<string, ts.SourceFile | undefined>();
const getSourceFile = host.getSourceFile;
host.getSourceFile = (fileName, languageVersion, ...rest) => {
	if (!sourceFiles.has(fileName)) {
		sourceFiles.set(
			fileName,
			getSourceFile.call(host, fileName, languageVersion, ...rest),
		);
	}
	return sourceFiles.get(fileName);
};

/** Typechecks one root file in its own program; returns formatted errors. */
const typecheck = (file: string, extra: ts.CompilerOptions = {}): string => {
	const program = ts.createProgram([file], { ...options, ...extra }, host);
	const diagnostics = ts.getPreEmitDiagnostics(program);
	return ts.formatDiagnostics(diagnostics, {
		getCanonicalFileName: (name) => name,
		getCurrentDirectory: () => root,
		getNewLine: () => "\n",
	});
};

const project = mkdtempSync(join(tmpdir(), "dezi-consumer-"));
try {
	cpSync(distDir, join(project, "node_modules", "dezi"), { recursive: true });
	writeFileSync(join(project, "package.json"), '{ "type": "module" }\n');

	const subpaths = [
		...["ops", "check", "format", "config", "preset"].flatMap((kind) =>
			readdirSync(join(distDir, kind))
				.filter((name) => name.endsWith(".js"))
				.map((name) => `dezi/${kind}/${name.slice(0, -3)}`),
		),
	];

	const entries = join(project, "entries");
	mkdirSync(entries);
	let errors = "";
	for (const subpath of subpaths) {
		const file = join(entries, `${subpath.replaceAll("/", "_")}.ts`);
		writeFileSync(file, `import "dezi";\nimport "${subpath}";\n`);
		errors += typecheck(file);
	}

	const fixtureFile = join(project, "fixture.ts");
	writeFileSync(fixtureFile, fixture);
	// node types only for node:assert in the fixture; dezi itself needs none.
	errors += typecheck(fixtureFile, {
		typeRoots: [resolve(root, "node_modules/@types")],
		types: ["node"],
	});

	if (errors) {
		console.error(errors);
		process.exitCode = 1;
	} else {
		execFileSync(process.execPath, [fixtureFile], { stdio: "inherit" });
		console.log(`consumer check passed (${subpaths.length} subpaths)`);
	}
} finally {
	rmSync(project, { recursive: true, force: true });
}
