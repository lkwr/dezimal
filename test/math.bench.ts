import { Decimal as DecimalJS } from "decimal.js";
import { expect, test } from "vitest";
import { Decimal } from "../src/index.ts";
import "../src/preset/full.ts";

/** Result of the last benchmarked operation, so engines cannot dead-store it. */
let sink: unknown;

// Smoke check that both libraries run the same math before we measure.
test("sanity", () => {
	expect(new Decimal("123.456").plus("7").toString()).toBe("130.456");
	expect(new DecimalJS("123.456").plus("7").toString()).toBe("130.456");
	expect(new Decimal("123.456").divide("7").toString()).toBe(
		new DecimalJS("123.456").dividedBy("7").toString(),
	);
	expect(new Decimal(2).sqrt().toString()).toBe(
		new DecimalJS(2).sqrt().toString(),
	);
});

test("parse", async ({ bench }) => {
	await bench.compare(
		bench("dezi", () => {
			sink = new Decimal("123.456");
		}),
		bench("decimal.js", () => {
			sink = new DecimalJS("123.456");
		}),
	);
});

test("plus", async ({ bench }) => {
	const a = new Decimal("123.456");
	const b = new Decimal(7);
	const jsA = new DecimalJS("123.456");
	const jsB = new DecimalJS(7);
	await bench.compare(
		bench("dezi", () => {
			sink = a.plus(b);
		}),
		bench("decimal.js", () => {
			sink = jsA.plus(jsB);
		}),
	);
});

test("minus", async ({ bench }) => {
	const a = new Decimal("123.456");
	const b = new Decimal(7);
	const jsA = new DecimalJS("123.456");
	const jsB = new DecimalJS(7);
	await bench.compare(
		bench("dezi", () => {
			sink = a.minus(b);
		}),
		bench("decimal.js", () => {
			sink = jsA.minus(jsB);
		}),
	);
});

test("times", async ({ bench }) => {
	const a = new Decimal("123.456");
	const b = new Decimal(7);
	const jsA = new DecimalJS("123.456");
	const jsB = new DecimalJS(7);
	await bench.compare(
		bench("dezi", () => {
			sink = a.times(b);
		}),
		bench("decimal.js", () => {
			sink = jsA.times(jsB);
		}),
	);
});

test("divide", async ({ bench }) => {
	const a = new Decimal("123.456");
	const b = new Decimal(7);
	const jsA = new DecimalJS("123.456");
	const jsB = new DecimalJS(7);
	await bench.compare(
		bench("dezi", () => {
			sink = a.divide(b);
		}),
		bench("decimal.js", () => {
			sink = jsA.dividedBy(jsB);
		}),
	);
});

test("sqrt", async ({ bench }) => {
	const a = new Decimal(2);
	const jsA = new DecimalJS(2);
	await bench.compare(
		bench("dezi", () => {
			sink = a.sqrt();
		}),
		bench("decimal.js", () => {
			sink = jsA.sqrt();
		}),
	);
	expect(sink).toBeDefined();
});
