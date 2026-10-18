import type { RoundingMode } from "dezimal";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/sqrt.ts";
import "../../src/format/to-string.ts";

/** Runs `sqrt` and returns the normalized raw [coefficient, exponent] tuple. */
const sqrt = (value: DecimalLike): RawDecimal => new Decimal(value).sqrt().raw;

describe("sqrt", () => {
	it("returns exact roots of perfect squares", () => {
		expect(sqrt(16)).toEqual([4n, 0]);
		expect(sqrt(9)).toEqual([3n, 0]);
		expect(sqrt("2.25")).toEqual([15n, -1]);
		expect(sqrt("0.25")).toEqual([5n, -1]);
		expect(sqrt("1e20")).toEqual([1n, 10]);
	});

	it("never rounds an exact root, whatever the mode", () => {
		const rounding = Decimal.rounding;
		const modes: RoundingMode[] = [
			"up",
			"down",
			"ceil",
			"floor",
			"half-up",
			"half-down",
			"half-even",
			"half-ceil",
			"half-floor",
		];
		try {
			for (const mode of modes) {
				Decimal.rounding = mode;
				expect(sqrt(16)).toEqual([4n, 0]);
			}
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("rounds irrational roots to the 20 default digits (half-up)", () => {
		expect(sqrt(2)).toEqual([14142135623730950488n, -19]);
		expect(new Decimal(2).sqrt().toString()).toBe("1.4142135623730950488");
		expect(sqrt(3)).toEqual([17320508075688772935n, -19]);
		expect(new Decimal(3).sqrt().toString()).toBe("1.7320508075688772935");
	});

	it("honors `Decimal.precision`", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 5;
			// The discarded fraction (0.1356...) is below half.
			expect(sqrt(2)).toEqual([14142n, -4]);
			expect(new Decimal(2).sqrt().toString()).toBe("1.4142");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("applies every rounding mode away from a tie", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 5;
			// √3 = 1.7320508075..: the fraction past the 5-digit truncation
			// 1.7320 is 0.50807.., above half, so only down/floor keep it.
			const expectations: [RoundingMode, string][] = [
				["half-up", "1.7321"],
				["half-even", "1.7321"],
				["half-down", "1.7321"],
				["up", "1.7321"],
				["down", "1.732"],
				["half-ceil", "1.7321"],
				["half-floor", "1.7321"],
				["ceil", "1.7321"],
				["floor", "1.732"],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				expect(new Decimal(3).sqrt().toString()).toBe(expected);
			}
			// down's truncation 1.7320 normalizes to 1.732.
			Decimal.rounding = "down";
			expect(new Decimal(3).sqrt().raw).toEqual([1732n, -3]);
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("applies every rounding mode at a tie", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 1;
			// √2.25 = 1.5 sits halfway between 1 and 2, and the truncated root
			// 1 is odd, so half-even rounds up.
			const expectations: [RoundingMode, string][] = [
				["half-up", "2"],
				["half-even", "2"],
				["half-down", "1"],
				["up", "2"],
				["down", "1"],
				["half-ceil", "2"],
				["half-floor", "1"],
				["ceil", "2"],
				["floor", "1"],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				expect(new Decimal("2.25").sqrt().toString()).toBe(expected);
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
			Decimal.precision = 1;
			Decimal.rounding = "half-even";
			// √6.25 = 2.5: the truncated root 2 is already even, so it stays.
			expect(new Decimal("6.25").sqrt().toString()).toBe("2");
			// half-up moves to the odd neighbour instead.
			Decimal.rounding = "half-up";
			expect(new Decimal("6.25").sqrt().toString()).toBe("3");
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("carries into a fresh power of ten when rounding up", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 2;
			// √99.99 = 9.99949..: 2 significant digits at half-up reach 1.0e2.
			Decimal.rounding = "half-up";
			expect(new Decimal("99.99").sqrt().raw).toEqual([1n, 1]);
			// down truncates instead.
			Decimal.rounding = "down";
			expect(new Decimal("99.99").sqrt().raw).toEqual([99n, -1]);
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("returns exact zero for a zero radicand", () => {
		expect(sqrt(0)).toEqual([0n, 0]);
		expect(sqrt("0.00")).toEqual([0n, 0]);
		expect(sqrt("-0")).toEqual([0n, 0]);
	});

	it("throws on a negative radicand", () => {
		expect(() => sqrt(-4)).toThrow(RangeError);
		expect(() => sqrt(-4)).toThrow("square root of a negative value");
		expect(() => sqrt("-0.25")).toThrow(RangeError);
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(16);
		expect(sqrt(self)).toEqual([4n, 0]);
		expect(sqrt("16")).toEqual([4n, 0]);
		expect(sqrt(16)).toEqual([4n, 0]);
		expect(sqrt(16n)).toEqual([4n, 0]);
		expect(sqrt([16n, 0] satisfies RawDecimal)).toEqual([4n, 0]);
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			expect(() => sqrt(16)).toThrow(RangeError);
			expect(() => sqrt(16)).toThrow("expected a positive integer");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("stays inside the exponent limit", () => {
		// √10 = 3.1622776601683793320 at 20 digits (rounds up), so
		// √1e999999 = 3.162277660168379332e+499999.
		expect(sqrt("1e999999")).toEqual([3162277660168379332n, 499981]);
		expect(sqrt("1e-999999")).toEqual([3162277660168379332n, -500018]);
	});

	it("throws outside the exponent limit", () => {
		expect(() => sqrt([1n, 2000002])).toThrow(RangeError);
		expect(() => sqrt([1n, 2000002])).toThrow("exponent out of range");
		expect(() => sqrt([1n, -2000002])).toThrow(RangeError);
	});
});

describe("sqrt options", () => {
	it("overrides precision and rounding for one call", () => {
		expect(new Decimal(2).sqrt({ precision: 5 }).toString()).toBe("1.4142");
		expect(
			new Decimal(2).sqrt({ precision: 5, rounding: "up" }).toString(),
		).toBe("1.4143");
	});
});
