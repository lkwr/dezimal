import type { RoundingMode } from "dezimal";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/divide.ts";
import "../../src/format/to-string.ts";

/** Runs `divide` and returns the normalized raw [coefficient, exponent] tuple. */
const divide = (self: DecimalLike, other: DecimalLike): RawDecimal =>
	new Decimal(self).divide(other).raw;

describe("divide", () => {
	it("divides exactly", () => {
		expect(divide(10, 2)).toEqual([5n, 0]);
		expect(divide(100, 25)).toEqual([4n, 0]);
		expect(divide(1, 4)).toEqual([25n, -2]);
		expect(divide(1, 1000)).toEqual([1n, -3]);
		expect(divide(0.75, 2)).toEqual([375n, -3]);
	});

	it("rounds repeating quotients to the 20 default digits (half-up)", () => {
		expect(divide(1, 3)).toEqual([33333333333333333333n, -20]);
		expect(new Decimal(1).divide(3).toString()).toBe("0.33333333333333333333");
		// The discarded tail (0.666..67) exceeds half, so half-up rounds up.
		expect(divide(2, 3)).toEqual([66666666666666666667n, -20]);
		expect(divide(10, 3)).toEqual([33333333333333333333n, -19]);
	});

	it("honors `Decimal.precision`", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 5;
			expect(divide(1, 3)).toEqual([33333n, -5]);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("applies every rounding mode at a tie", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 2;
			const expectations: [RoundingMode, string][] = [
				["half-up", "0.13"],
				["half-even", "0.12"],
				["half-down", "0.12"],
				["up", "0.13"],
				["down", "0.12"],
				["half-ceil", "0.13"],
				["half-floor", "0.12"],
				["ceil", "0.13"],
				["floor", "0.12"],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				// 0.125 splits exactly halfway between 0.12 and 0.13.
				expect(new Decimal("0.125").divide(1).toString()).toBe(expected);
			}
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("breaks halfway ties to even with half-even", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 2;
			Decimal.rounding = "half-even";
			// 13|5 -> 13 is odd, so round up to the even neighbour.
			expect(new Decimal("0.135").divide(1).toString()).toBe("0.14");
			// 14|5 -> 14 is already even, so it stays.
			expect(new Decimal("0.145").divide(1).toString()).toBe("0.14");
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("mirrors tie modes for negative quotients", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 2;
			const expectations: [RoundingMode, string][] = [
				["half-up", "-0.13"],
				["half-even", "-0.12"],
				["half-down", "-0.12"],
				["up", "-0.13"],
				["down", "-0.12"],
				["half-ceil", "-0.12"],
				["half-floor", "-0.13"],
				["ceil", "-0.12"],
				["floor", "-0.13"],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				// -0.125's tie resolution flips with the result's sign.
				expect(new Decimal("-0.125").divide(1).toString()).toBe(expected);
			}
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("never rounds an exact quotient", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 2;
			Decimal.rounding = "floor";
			expect(new Decimal("0.25").divide(1).toString()).toBe("0.25");
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("signs the quotient by the operand signs", () => {
		expect(divide(-1, 2)).toEqual([-5n, -1]);
		expect(divide(1, -3)).toEqual([-33333333333333333333n, -20]);
		expect(divide(-6, -3)).toEqual([2n, 0]);
	});

	it("returns exact zero for a zero dividend", () => {
		expect(divide(0, 5)).toEqual([0n, 0]);
	});

	it("throws on a zero divisor first, so 0/0 throws too", () => {
		expect(() => divide(0, 0)).toThrow(RangeError);
		expect(() => divide(0, 0)).toThrow("division by zero");
		expect(() => divide(5, 0)).toThrow(RangeError);
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(6);
		expect(divide(self, "3")).toEqual([2n, 0]);
		expect(divide(self, 3)).toEqual([2n, 0]);
		expect(divide(self, 3n)).toEqual([2n, 0]);
		expect(divide(self, new Decimal(3))).toEqual([2n, 0]);
		expect(divide(self, [3n, 0] satisfies RawDecimal)).toEqual([2n, 0]);
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			expect(() => divide(1, 3)).toThrow(RangeError);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("stays inside the exponent limit", () => {
		expect(divide("1e999999", "1e999997")).toEqual([1n, 2]);
	});

	it("throws outside the exponent limit", () => {
		expect(() => new Decimal("1e999999").divide("1e-999999")).toThrow(
			RangeError,
		);
		expect(() => new Decimal("1e-999999").divide("1e999999")).toThrow(
			RangeError,
		);
	});

	it("exposes div as an alias", () => {
		// 0.50 normalizes to 0.5.
		expect(new Decimal(1).div(2n).raw).toEqual([5n, -1]);
	});
});

describe("divide options", () => {
	it("overrides precision and rounding for one call", () => {
		const third = new Decimal(1).divide(3, { precision: 5 });
		expect(third.toString()).toBe("0.33333");
		expect(
			new Decimal(1).divide(3, { precision: 5, rounding: "up" }).toString(),
		).toBe("0.33334");
		expect(new Decimal(2).divide(3, { rounding: "down" }).toString()).toBe(
			"0.66666666666666666666",
		);
		expect(Decimal.precision).toBe(20);
		expect(Decimal.rounding).toBe("half-up");
	});

	it("validates the overrides", () => {
		expect(() => new Decimal(1).divide(3, { precision: 0 })).toThrow(
			RangeError,
		);
		expect(() =>
			new Decimal(1).divide(3, { rounding: "nearest" as RoundingMode }),
		).toThrow(RangeError);
	});
});
