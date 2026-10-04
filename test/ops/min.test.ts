import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/min.ts";

/** Runs `min` and returns the normalized raw [coefficient, exponent] tuple. */
const min = (...values: [DecimalLike, ...DecimalLike[]]): RawDecimal =>
	Decimal.min(...values).raw;

describe("min", () => {
	it("returns the smallest of the given values", () => {
		expect(min("1.5", 2, 1n)).toEqual([1n, 0]);
		expect(min(2, 1.5, 3)).toEqual([15n, -1]);
		expect(min("9.99", "10")).toEqual([999n, -2]);
	});

	it("compares exactly beyond double precision", () => {
		// 1e20 is smaller than 100000000000000000001n, which a double comparison
		// cannot see.
		expect(min("1e20", 100_000_000_000_000_000_001n)).toEqual([1n, 20]);
		expect(min(100_000_000_000_000_000_001n, "1e20")).toEqual([1n, 20]);
	});

	it("orders negative values", () => {
		expect(min(-5, -3)).toEqual([-5n, 0]);
		expect(min("-0.5", -1)).toEqual([-1n, 0]);
	});

	it("handles zero against negatives", () => {
		expect(min(0, 0n, "0")).toEqual([0n, 0]);
		expect(min(0, -1)).toEqual([-1n, 0]);
		expect(min(-1, 0)).toEqual([-1n, 0]);
	});

	it("accepts every DecimalLike form", () => {
		// [2n, -1] is 0.2; new Decimal(-5.5) is the eventual winner.
		expect(min("1", 2, 3n, [2n, -1], new Decimal(-5.5))).toEqual([-55n, -1]);
	});

	it("keeps the earlier value on ties and returns a fresh Decimal", () => {
		const instance = new Decimal("1.5");
		const result = Decimal.min(instance, "1.50", 1.5);
		expect(result).not.toBe(instance);
		expect(result.raw).toEqual([15n, -1]);
	});

	it("normalizes the result", () => {
		expect(min("1.50", "1.5")).toEqual([15n, -1]);
		expect(min("1e20", "10e19")).toEqual([1n, 20]);
	});

	it("returns a fresh value for a single argument", () => {
		expect(min(12.5)).toEqual([125n, -1]);
	});

	it("throws when called without arguments", () => {
		expect(() => Decimal.min()).toThrow(RangeError);
		expect(() => Decimal.min()).toThrow("min requires at least one value");
	});

	it("throws on invalid input", () => {
		expect(() => Decimal.min("x")).toThrow(TypeError);
	});
});
