import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/max.ts";

/** Runs `max` and returns the normalized raw [coefficient, exponent] tuple. */
const max = (...values: [DecimalLike, ...DecimalLike[]]): RawDecimal =>
	Decimal.max(...values).raw;

describe("max", () => {
	it("returns the largest of the given values", () => {
		expect(max("1.5", 2, 1n)).toEqual([2n, 0]);
		expect(max(2, 1.5, 3)).toEqual([3n, 0]);
		expect(max("9.99", "10")).toEqual([1n, 1]);
	});

	it("compares exactly beyond double precision", () => {
		// 100000000000000000001 beats 1e20, which a double comparison cannot see.
		expect(max("1e20", 100_000_000_000_000_000_001n)).toEqual([
			100_000_000_000_000_000_001n,
			0,
		]);
		expect(max(100_000_000_000_000_000_001n, "1e20")).toEqual([
			100_000_000_000_000_000_001n,
			0,
		]);
	});

	it("orders negative values", () => {
		expect(max(-5, -3)).toEqual([-3n, 0]);
		expect(max("-0.5", -1)).toEqual([-5n, -1]);
	});

	it("handles zero", () => {
		expect(max(0, 0n, "0")).toEqual([0n, 0]);
		expect(max(-1, 0)).toEqual([0n, 0]);
	});

	it("accepts every DecimalLike form", () => {
		// [2n, -1] is 0.2; new Decimal(5.5) is the eventual winner.
		expect(max("1", 2, 3n, [2n, -1], new Decimal(5.5))).toEqual([55n, -1]);
	});

	it("keeps the earlier value on ties and returns a fresh Decimal", () => {
		const instance = new Decimal("1.5");
		const result = Decimal.max(instance, "1.50", 1.5);
		expect(result).not.toBe(instance);
		expect(result.raw).toEqual([15n, -1]);
	});

	it("normalizes the result", () => {
		expect(max("1.50", "1.5")).toEqual([15n, -1]);
		expect(max("1e20", "10e19")).toEqual([1n, 20]);
	});

	it("returns a fresh value for a single argument", () => {
		expect(max(12.5)).toEqual([125n, -1]);
	});

	it("throws when called without arguments", () => {
		expect(() => Decimal.max()).toThrow(RangeError);
		expect(() => Decimal.max()).toThrow("max requires at least one value");
	});

	it("throws on invalid input", () => {
		expect(() => Decimal.max("x")).toThrow(TypeError);
	});
});
