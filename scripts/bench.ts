// Compares the throughput of dezimal (all extensions via the full preset) with
// decimal.js on the same inputs, in plain Node: no test runner, whose module
// wrappers would add a per-call overhead to every imported helper and skew
// the many-small-modules side.
//
// Each case first asserts that both libraries produce the same result. The
// two sides are then sampled in alternation and the median rate is reported,
// so frequency scaling and GC pauses hit both alike.
//
// Usage: pnpm run bench [filter]   (filter: substring of the case names)

import { Decimal as DecimalJS } from "decimal.js";
import { Decimal } from "../src/index.ts";
import "../src/preset/full.ts";

type Case = {
	name: string;
	dezimal: () => unknown;
	decimalJs: () => unknown;
};

const SAMPLES = 9;
const SAMPLE_MS = 60;
const WARMUP_MS = 150;

/** Last result of a measured call, so the engine cannot drop the work. */
let sink: unknown;

const a = new Decimal("123.456");
const b = new Decimal(7);
const jsA = new DecimalJS("123.456");
const jsB = new DecimalJS(7);

const bigText = "12345678901234567890.123456789";
const big = new Decimal(bigText);
const jsBig = new DecimalJS(bigText);

const wideX = "3.1415926535897932384626433832795028841971693993751";
const wideY = "2.7182818284590452353602874713526624977572470936999";
const wideA = new Decimal(wideX);
const wideB = new Decimal(wideY);
// decimal.js rounds even plus/times to its precision; 120 digits keep the
// 50-digit sums and products exact, like dezimal's.
const DecimalJSExact = DecimalJS.clone({ precision: 120 });
const jsWideA = new DecimalJSExact(wideX);
const jsWideB = new DecimalJSExact(wideY);

const PRECISION_50 = { precision: 50 };
const DecimalJS50 = DecimalJS.clone({ precision: 50 });
const js50A = new DecimalJS50(wideX);
const js50B = new DecimalJS50(wideY);

const cases: Case[] = [
	{
		name: "parse",
		dezimal: () => new Decimal("123.456"),
		decimalJs: () => new DecimalJS("123.456"),
	},
	{ name: "plus", dezimal: () => a.plus(b), decimalJs: () => jsA.plus(jsB) },
	{ name: "minus", dezimal: () => a.minus(b), decimalJs: () => jsA.minus(jsB) },
	{ name: "times", dezimal: () => a.times(b), decimalJs: () => jsA.times(jsB) },
	{ name: "divide", dezimal: () => a.divide(b), decimalJs: () => jsA.div(jsB) },
	{
		name: "compare",
		dezimal: () => a.compare(b),
		decimalJs: () => jsA.cmp(jsB),
	},
	{
		name: "toString",
		dezimal: () => big.toString(),
		decimalJs: () => jsBig.toString(),
	},
	{
		name: "toFixed(2)",
		dezimal: () => big.toFixed(2),
		decimalJs: () => jsBig.toFixed(2),
	},
	{ name: "sqrt", dezimal: () => b.sqrt(), decimalJs: () => jsB.sqrt() },
	{ name: "ln", dezimal: () => a.ln(), decimalJs: () => jsA.ln() },
	{ name: "exp", dezimal: () => b.exp(), decimalJs: () => jsB.exp() },
	{
		name: "pow 1.5",
		dezimal: () => a.pow("1.5"),
		decimalJs: () => jsA.pow("1.5"),
	},
	{ name: "pow 17", dezimal: () => a.pow(17), decimalJs: () => jsA.pow(17) },
	{
		name: "50 digits: plus",
		dezimal: () => wideA.plus(wideB),
		decimalJs: () => jsWideA.plus(jsWideB),
	},
	{
		name: "50 digits: times",
		dezimal: () => wideA.times(wideB),
		decimalJs: () => jsWideA.times(jsWideB),
	},
	{
		name: "50 digits: divide",
		dezimal: () => wideA.divide(wideB, PRECISION_50),
		decimalJs: () => js50A.div(js50B),
	},
	{
		name: "50 digits: sqrt",
		dezimal: () => wideA.sqrt(PRECISION_50),
		decimalJs: () => js50A.sqrt(),
	},
	{
		name: "50 digits: ln",
		dezimal: () => wideA.ln(PRECISION_50),
		decimalJs: () => js50A.ln(),
	},
];

/** Calls `fn` for about `ms` milliseconds; returns calls per second. */
const measure = (fn: () => unknown, ms: number): number => {
	let calls = 0;
	const start = performance.now();
	let elapsed = 0;
	do {
		for (let i = 0; i < 100; i++) {
			sink = fn();
		}
		calls += 100;
		elapsed = performance.now() - start;
	} while (elapsed < ms);
	return (calls / elapsed) * 1000;
};

const median = (values: number[]): number => {
	const sorted = values.toSorted((x, y) => x - y);
	return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
};

const formatRate = (rate: number): string =>
	rate >= 1e6
		? `${(rate / 1e6).toFixed(2)} M/s`
		: `${(rate / 1e3).toFixed(1)} k/s`;

const filter = process.argv[2];
const selected = cases.filter(({ name }) => !filter || name.includes(filter));

const rows = selected.map(({ name, dezimal, decimalJs }) => {
	const expected = String(decimalJs());
	const actual = String(dezimal());
	if (actual !== expected) {
		throw new Error(`${name}: dezimal ${actual} ≠ decimal.js ${expected}`);
	}

	measure(dezimal, WARMUP_MS);
	measure(decimalJs, WARMUP_MS);
	const dezimalRates: number[] = [];
	const decimalJsRates: number[] = [];
	for (let i = 0; i < SAMPLES; i++) {
		dezimalRates.push(measure(dezimal, SAMPLE_MS));
		decimalJsRates.push(measure(decimalJs, SAMPLE_MS));
	}
	const dezimalRate = median(dezimalRates);
	const decimalJsRate = median(decimalJsRates);
	return [
		name,
		formatRate(dezimalRate),
		formatRate(decimalJsRate),
		`${(dezimalRate / decimalJsRate).toFixed(2)}×`,
	];
});

const header = ["case", "dezimal", "decimal.js", "dezimal speed"];
const widths = header.map((title, column) =>
	Math.max(title.length, ...rows.map((row) => row[column]?.length ?? 0)),
);
const line = (cells: string[]) =>
	cells
		.map((cell, column) =>
			column === 0
				? cell.padEnd(widths[column] ?? 0)
				: cell.padStart(widths[column] ?? 0),
		)
		.join("  ");

console.log(line(header));
for (const row of rows) {
	console.log(line(row));
}
console.log(
	`\nnode ${process.version}, median of ${SAMPLES} × ${SAMPLE_MS} ms samples; dezimal speed > 1 means faster than decimal.js`,
);
void sink;
