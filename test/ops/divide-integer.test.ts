import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/divide-integer.ts";

/** Runs `divideInteger` and returns the normalized raw [coefficient, exponent] tuple. */
const divideInteger = (self: DecimalLike, other: DecimalLike): RawDecimal =>
	new Decimal(self).divideInteger(other).raw;

describe("divideInteger", () => {
	it("truncates the integer part of the division towards zero", () => {
		expect(divideInteger(5, "0.7")).toEqual([7n, 0]);
		// 5 / 3 = 1.666... -> 1, not 2.
		expect(divideInteger(5, 3)).toEqual([1n, 0]);
		expect(divideInteger(-5, 3)).toEqual([-1n, 0]);
		expect(divideInteger(5, -3)).toEqual([-1n, 0]);
		expect(divideInteger(-5, -3)).toEqual([1n, 0]);
	});

	it("returns a zero quotient when the integer part vanishes", () => {
		expect(divideInteger(1, 100)).toEqual([0n, 0]);
		expect(divideInteger(0, 5)).toEqual([0n, 0]);
		expect(divideInteger(0, "0.7")).toEqual([0n, 0]);
	});

	it("scales exact integer quotients onto the divisor's grid", () => {
		// 10 / 0.5 = 20, stored normalized as [2, 1].
		expect(divideInteger(10, "0.5")).toEqual([2n, 1]);
	});

	it("rounds quotients beyond precision to significant digits", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 20;
			// 25-digit quotient: the tail "12345" is below half of the 10^5 grid,
			// so the leading 20 digits stay and normalize absorbs the trailing
			// zero into the exponent (1.234567890123456789e24).
			expect(divideInteger("1234567890123456789012345", 1)).toEqual([
				1234567890123456789n,
				6,
			]);
			// The same quotient padded by three zeros: the significant-digit
			// grid follows the quotient's exponent (25 + 3 - 20 = 8).
			expect(divideInteger("1234567890123456789012345000", 1)).toEqual([
				1234567890123456789n,
				9,
			]);
			// A quotient with at most 20 significant digits is untouched.
			expect(divideInteger("12345678901234567890", 1)).toEqual([
				1234567890123456789n,
				1,
			]);
			// Rounding keeps the quotient's sign.
			expect(divideInteger("-1234567890123456789012345", 1)).toEqual([
				-1234567890123456789n,
				6,
			]);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("throws on a zero divisor first, so 0/0 throws too", () => {
		expect(() => divideInteger(0, 0)).toThrow(RangeError);
		expect(() => divideInteger(0, 0)).toThrow("division by zero");
		expect(() => divideInteger(5, 0)).toThrow(RangeError);
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			// A nonzero quotient is required: the zero-quotient path returns
			// before the guard, like divide's zero-dividend path.
			expect(() => divideInteger(5, 2)).toThrow(RangeError);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(6);
		expect(divideInteger(self, "3")).toEqual([2n, 0]);
		expect(divideInteger(self, 3)).toEqual([2n, 0]);
		expect(divideInteger(self, 3n)).toEqual([2n, 0]);
		expect(divideInteger(self, new Decimal(3))).toEqual([2n, 0]);
		expect(divideInteger(self, [3n, 0] satisfies RawDecimal)).toEqual([2n, 0]);
	});

	it("exposes divToInt as an alias", () => {
		// 7 / 2 = 3.5, truncated to 3.
		expect(new Decimal(7).divToInt(2n).raw).toEqual([3n, 0]);
	});
});

describe("divideInteger options", () => {
	it("overrides precision and rounding for one call", () => {
		expect(new Decimal(100).divideInteger(3, { precision: 1 }).raw).toEqual([
			3n,
			1,
		]);
		expect(
			new Decimal(100).divideInteger(3, { precision: 1, rounding: "up" }).raw,
		).toEqual([4n, 1]);
	});
});
