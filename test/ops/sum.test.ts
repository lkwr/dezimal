import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/sum.ts";

/** Runs the static `sum` and returns the normalized raw [coefficient, exponent] tuple. */
const sum = (...values: DecimalLike[]): RawDecimal =>
	Decimal.sum(...values).raw;

describe("sum (static)", () => {
	it("throws a RangeError without values", () => {
		expect(() => Decimal.sum()).toThrow(RangeError);
	});

	it("returns a single value exactly", () => {
		expect(sum(5n)).toEqual([5n, 0]);
		expect(sum("-0.5")).toEqual([-5n, -1]);
	});

	it("is exact beyond double precision", () => {
		// 1e20 + 1 exceeds the spacing of JS doubles at that magnitude
		expect(sum("1e20", 1n)).toEqual([100000000000000000001n, 0]);
	});

	it("adds decimals with different exponents exactly", () => {
		// JS double addition yields 0.1 + 0.2 = 0.30000000000000004; dezimal is exact
		expect(sum("0.1", "0.2")).toEqual([3n, -1]);
	});

	it("cancels negatives to zero without a signed zero", () => {
		expect(sum(1.5, -1.5)).toEqual([0n, 0]);
		expect(sum("1e-10", "1e-10", "-2e-10")).toEqual([0n, 0]);
	});

	it("accepts every DecimalLike input", () => {
		const instance = new Decimal(3);
		expect(sum("0.5", 0.5, 0n, instance, [5n, -1])).toEqual([45n, -1]);
	});
});
