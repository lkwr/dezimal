import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import { parse } from "../../src/utils/parse.ts";

describe("parse", () => {
	it("parses bigint as [value, 0]", () => {
		expect(parse(5n)).toEqual([5n, 0]);
	});

	it("parses numbers through their string form", () => {
		expect(parse(1.5)).toEqual([15n, -1]);
		expect(parse(-0.5)).toEqual([-5n, -1]);
		expect(parse(0)).toEqual([0n, 0]);
		expect(parse(1e21)).toEqual([1n, 21]);
	});

	it("throws for non-finite numbers", () => {
		expect(() => parse(Number.NaN)).toThrow(RangeError);
		expect(() => parse(Number.POSITIVE_INFINITY)).toThrow(RangeError);
		expect(() => parse(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
	});

	it("passes Decimal instances through unchanged", () => {
		const decimal = new Decimal("1.50");
		expect(parse(decimal)).toEqual(decimal.raw);
	});

	it("normalizes raw tuples", () => {
		expect(parse([5n, -1])).toEqual([5n, -1]);
		expect(parse([500n, -3])).toEqual([5n, -1]);
		expect(parse([0n, 7])).toEqual([0n, 0]);
		expect(parse([10n ** 4000n, 0])).toEqual([1n, 4000]);
	});

	it("checks the normalized exponent against the limit", () => {
		expect(parse([10n, 999998])).toEqual([1n, 999999]);
		expect(parse([10n ** 6n, -1000005])).toEqual([1n, -999999]);
		expect(() => parse([10n, 999999])).toThrow("exponent out of range");
		expect(() => parse([1n, -1000000])).toThrow(RangeError);
		expect(() => parse([1n, Number.MAX_SAFE_INTEGER + 1])).toThrow(TypeError);
	});

	it("throws for invalid tuples", () => {
		// coefficient not a bigint
		expect(() => parse([1 as never, -2])).toThrow(TypeError);
		// exponent not a number
		expect(() => parse([5n, "+" as never])).toThrow(TypeError);
		// fractional exponent
		expect(() => parse([5n, 0.5])).toThrow(TypeError);
	});

	it("throws for unsupported types", () => {
		expect(() => parse(null as never)).toThrow(TypeError);
		expect(() => parse(Symbol.iterator as never)).toThrow(TypeError);
	});
});

describe("parse (strings)", () => {
	it("parses plain integers and decimals", () => {
		expect(parse("1")).toEqual([1n, 0]);
		expect(parse("1.5")).toEqual([15n, -1]);
		expect(parse(".5")).toEqual([5n, -1]);
		expect(parse("1.")).toEqual([1n, 0]);
		expect(parse("0")).toEqual([0n, 0]);
	});

	it("treats leading zeros as insignificant", () => {
		expect(parse("007")).toEqual([7n, 0]);
		expect(parse("0.05")).toEqual([5n, -2]);
	});

	it("honors signs and exponents", () => {
		expect(parse("+1.5")).toEqual([15n, -1]);
		expect(parse("-0")).toEqual([0n, 0]);
		expect(parse("1e3")).toEqual([1n, 3]);
		expect(parse("1E-3")).toEqual([1n, -3]);
		expect(parse("1.e2")).toEqual([1n, 2]);
		// 1.5e2 = 150, expressed as 15 * 10^1
		expect(parse("1.5e2")).toEqual([15n, 1]);
	});

	it("normalizes trailing zeros", () => {
		expect(parse("1.50")).toEqual([15n, -1]);
		expect(parse("1500")).toEqual([15n, 2]);
		expect(parse("0e5000000")).toEqual([0n, 0]);
	});

	it("accepts exponents up to the exponent limit", () => {
		expect(parse("1e999999")).toEqual([1n, 999999]);
		expect(parse("10e999998")).toEqual([1n, 999999]);
		expect(() => parse("1e1000000")).toThrow(RangeError);
		expect(() => parse(`1e${"9".repeat(400)}`)).toThrow(RangeError);
	});

	it("throws for non-numeric strings", () => {
		for (const input of ["", "abc", "1,5", "1 2", "--1", "+-1", "1.2.3", "1e"])
			expect(() => parse(input)).toThrow(TypeError);
	});
});
