import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/minus.ts";

/** Runs `minus` and returns the normalized raw [coefficient, exponent] tuple. */
const minus = (self: DecimalLike, other: DecimalLike): RawDecimal =>
	new Decimal(self).minus(other).raw;

describe("minus", () => {
	it("subtracts integers", () => {
		expect(minus(123n, 100n)).toEqual([23n, 0]);
	});

	it("subtracts decimals with different exponents", () => {
		// 1.5 - 2.25 = -0.75
		expect(minus(1.5, 2.25)).toEqual([-75n, -2]);
	});

	it("subtracts negative operands", () => {
		expect(minus(-1.5, -1.5)).toEqual([0n, 0]);
		expect(minus(-1.5, 1.5)).toEqual([-3n, 0]);
	});

	it("canonicalizes zero to [0n, 0]", () => {
		// 0.99 - 0.99 = 0.00 -> 0
		expect(minus("0.99", "0.99")).toEqual([0n, 0]);
	});

	it("normalizes trailing zeros", () => {
		// 1.50 - 1.10 = 0.40 -> 0.4
		expect(minus("1.50", "1.10")).toEqual([4n, -1]);
	});

	it("never loses precision when aligning exponents", () => {
		// 1e20 - 1 = 99999999999999999999 (aligned to the smaller exponent)
		expect(minus("1e20", 1n)).toEqual([10n ** 20n - 1n, 0]);
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(1);
		expect(minus(self, "0.5")).toEqual([5n, -1]);
		expect(minus(self, 0.5)).toEqual([5n, -1]);
		expect(minus(self, 0n)).toEqual([1n, 0]);
		expect(minus(self, new Decimal(0.5))).toEqual([5n, -1]);
		expect(minus(self, [5n, -1] satisfies RawDecimal)).toEqual([5n, -1]);
	});

	it("exposes sub and subtract as aliases", () => {
		expect(new Decimal(2).sub(1n).raw).toEqual([1n, 0]);
		expect(new Decimal(2).subtract(1n).raw).toEqual([1n, 0]);
	});

	it("throws on invalid input", () => {
		expect(() => new Decimal(1).minus(null as unknown as DecimalLike)).toThrow(
			TypeError,
		);
	});
});
