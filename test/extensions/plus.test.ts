import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/extensions/plus.ts";

/** Runs `plus` and returns the normalized raw [coefficient, exponent] tuple. */
const plus = (self: DecimalLike, other: DecimalLike): RawDecimal =>
	new Decimal(self).plus(other).raw;

describe("plus", () => {
	it("adds integers", () => {
		expect(plus(123n, 100n)).toEqual([223n, 0]);
	});

	it("adds decimals with different exponents", () => {
		// 1.5 + 2.25 = 3.75
		expect(plus(1.5, 2.25)).toEqual([375n, -2]);
	});

	it("adds negative operands", () => {
		expect(plus(-1.5, -1.5)).toEqual([-3n, 0]);
		expect(plus(-1.5, 1.5)).toEqual([0n, 0]);
	});

	it("normalizes trailing zeros", () => {
		// 1.10 + 1.10 = 2.20 -> 2.2
		expect(plus("1.10", "1.10")).toEqual([22n, -1]);
	});

	it("carries across the exponent boundary", () => {
		// 0.99 + 0.01 = 1
		expect(plus("0.99", "0.01")).toEqual([1n, 0]);
	});

	it("never loses precision when aligning exponents", () => {
		// 1e20 + 1 = 100000000000000000001 (aligned to the smaller exponent)
		expect(plus("1e20", 1n)).toEqual([10n ** 20n + 1n, 0]);
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(1);
		expect(plus(self, "0.5")).toEqual([15n, -1]);
		expect(plus(self, 0.5)).toEqual([15n, -1]);
		expect(plus(self, 0n)).toEqual([1n, 0]);
		expect(plus(self, new Decimal(0.5))).toEqual([15n, -1]);
		expect(plus(self, [5n, -1] satisfies RawDecimal)).toEqual([15n, -1]);
	});

	it("exposes add as an alias", () => {
		expect(new Decimal(1).add(2n).raw).toEqual([3n, 0]);
	});

	it("throws on invalid input", () => {
		expect(() => new Decimal(1).plus(null as unknown as DecimalLike)).toThrow(
			TypeError,
		);
	});
});
