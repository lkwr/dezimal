import type { RoundingMode } from "dezimal";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/cbrt.ts";
import "../../src/format/to-string.ts";

/** Runs `cbrt` and returns the normalized raw [coefficient, exponent] tuple. */
const cbrt = (value: DecimalLike): RawDecimal => new Decimal(value).cbrt().raw;

describe("cbrt", () => {
	it("returns exact roots of perfect cubes", () => {
		expect(cbrt(8)).toEqual([2n, 0]);
		expect(cbrt(27)).toEqual([3n, 0]);
		expect(cbrt("-27")).toEqual([-3n, 0]);
		expect(cbrt("3.375")).toEqual([15n, -1]);
		expect(cbrt("-3.375")).toEqual([-15n, -1]);
		expect(cbrt("0.027")).toEqual([3n, -1]);
		expect(cbrt("1e21")).toEqual([1n, 7]);
		expect(cbrt("1e-21")).toEqual([1n, -7]);
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
				expect(cbrt(8)).toEqual([2n, 0]);
				expect(cbrt("3.375")).toEqual([15n, -1]);
			}
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("rounds irrational roots to the 20 default digits (half-up)", () => {
		expect(cbrt(2)).toEqual([12599210498948731648n, -19]);
		expect(new Decimal(2).cbrt().toString()).toBe("1.2599210498948731648");
		expect(cbrt(-2)).toEqual([-12599210498948731648n, -19]);
		expect(new Decimal(-2).cbrt().toString()).toBe("-1.2599210498948731648");
		expect(cbrt(3)).toEqual([14422495703074083823n, -19]);
		expect(new Decimal(3).cbrt().toString()).toBe("1.4422495703074083823");
		expect(cbrt(-3)).toEqual([-14422495703074083823n, -19]);
	});

	it("honors `Decimal.precision`", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 5;
			// The discarded fraction (0.2104...) is below half.
			expect(cbrt(2)).toEqual([12599n, -4]);
			expect(new Decimal(2).cbrt().toString()).toBe("1.2599");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("applies every rounding mode away from a tie", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 5;
			// ∛5 = 1.70997594666...: the fraction past the 5-digit truncation
			// 1.7099 is 0.75946..., above half, so only down/floor keep it.
			const expectations: [RoundingMode, string][] = [
				["half-up", "1.71"],
				["half-even", "1.71"],
				["half-down", "1.71"],
				["up", "1.71"],
				["down", "1.7099"],
				["half-ceil", "1.71"],
				["half-floor", "1.71"],
				["ceil", "1.71"],
				["floor", "1.7099"],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				expect(new Decimal(5).cbrt().toString()).toBe(expected);
			}
			// down keeps the truncation.
			Decimal.rounding = "down";
			expect(new Decimal(5).cbrt().raw).toEqual([17099n, -4]);
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
			// ∛3.375 = 1.5 sits halfway between 1 and 2, and the truncated
			// root 1 is odd, so half-even rounds up.
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
				expect(new Decimal("3.375").cbrt().toString()).toBe(expected);
			}
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("resolves a tie's sign-aware modes towards ±Infinity", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 1;
			// ∛-3.375 = -1.5 sits halfway between -1 and -2: "ceil" and
			// "half-ceil" keep -1 (towards +Infinity), "floor" and
			// "half-floor" take -2 (towards -Infinity), "half-up" moves away
			// from zero, "half-down" towards zero, and "half-even" reaches
			// the even -2 from the odd truncated magnitude 1.
			const expectations: [RoundingMode, string][] = [
				["half-up", "-2"],
				["half-even", "-2"],
				["half-down", "-1"],
				["up", "-2"],
				["down", "-1"],
				["half-ceil", "-1"],
				["half-floor", "-2"],
				["ceil", "-1"],
				["floor", "-2"],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				expect(new Decimal("-3.375").cbrt().toString()).toBe(expected);
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
			// ∛15.625 = 2.5: the truncated root 2 is already even, so it stays.
			expect(new Decimal("15.625").cbrt().toString()).toBe("2");
			// half-up moves to the odd neighbour instead.
			Decimal.rounding = "half-up";
			expect(new Decimal("15.625").cbrt().toString()).toBe("3");
			// ∛-15.625 = -2.5: half-even still rounds to the even -2, while
			// half-up leaves for -3 away from zero.
			Decimal.rounding = "half-even";
			expect(new Decimal("-15.625").cbrt().toString()).toBe("-2");
			Decimal.rounding = "half-up";
			expect(new Decimal("-15.625").cbrt().toString()).toBe("-3");
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
			// ∛999 = 9.99666...: 2 significant digits at half-up reach 1.0e1.
			Decimal.rounding = "half-up";
			expect(new Decimal(999).cbrt().raw).toEqual([1n, 1]);
			// down truncates instead.
			Decimal.rounding = "down";
			expect(new Decimal(999).cbrt().raw).toEqual([99n, -1]);
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("applies the ±Infinity modes sign-aware to negative results", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 5;
			// ∛3 = 1.4422495703..., so ∛-3 = -1.44224957...: the discarded
			// fraction past the 5-digit truncation is 0.4957..., below half,
			// so "ceil" keeps the truncation -1.4422 (towards +Infinity),
			// "floor" steps to -1.4423 (towards -Infinity), and the
			// half-ceil/half-floor ties never arise here.
			Decimal.rounding = "ceil";
			expect(cbrt(-3)).toEqual([-14422n, -4]);
			Decimal.rounding = "floor";
			expect(cbrt(-3)).toEqual([-14423n, -4]);
			Decimal.rounding = "half-ceil";
			expect(cbrt(-3)).toEqual([-14422n, -4]);
			Decimal.rounding = "half-floor";
			expect(cbrt(-3)).toEqual([-14422n, -4]);
			// ∛100 = 4.64158883..., so ∛-100 = -4.64158883...: the discarded
			// fraction 0.8883... is above half, so "floor" and every nearest
			// mode step to -4.6416 while "ceil" (towards +Infinity) and
			// "down" (towards zero) keep the truncation -4.6415.
			Decimal.rounding = "ceil";
			expect(cbrt(-100)).toEqual([-46415n, -4]);
			Decimal.rounding = "floor";
			expect(cbrt(-100)).toEqual([-46416n, -4]);
			Decimal.rounding = "up";
			expect(cbrt(-100)).toEqual([-46416n, -4]);
			Decimal.rounding = "down";
			expect(cbrt(-100)).toEqual([-46415n, -4]);
			Decimal.rounding = "half-up";
			expect(cbrt(-100)).toEqual([-46416n, -4]);
			Decimal.rounding = "half-down";
			expect(cbrt(-100)).toEqual([-46416n, -4]);
			Decimal.rounding = "half-even";
			expect(cbrt(-100)).toEqual([-46416n, -4]);
			Decimal.rounding = "half-ceil";
			expect(cbrt(-100)).toEqual([-46416n, -4]);
			Decimal.rounding = "half-floor";
			expect(cbrt(-100)).toEqual([-46416n, -4]);
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("returns exact zero for a zero radicand", () => {
		expect(cbrt(0)).toEqual([0n, 0]);
		expect(cbrt("0.00")).toEqual([0n, 0]);
		expect(cbrt("-0")).toEqual([0n, 0]);
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(8);
		expect(cbrt(self)).toEqual([2n, 0]);
		expect(cbrt("8")).toEqual([2n, 0]);
		expect(cbrt(8)).toEqual([2n, 0]);
		expect(cbrt(8n)).toEqual([2n, 0]);
		expect(cbrt([8n, 0] satisfies RawDecimal)).toEqual([2n, 0]);
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			expect(() => cbrt(8)).toThrow(RangeError);
			expect(() => cbrt(8)).toThrow("expected a positive integer");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("stays inside the exponent limit", () => {
		// ∛1e999999 = 1e333333 exactly, since 999999 = 3·333333.
		expect(cbrt("1e999999")).toEqual([1n, 333333]);
		expect(cbrt("1e-999999")).toEqual([1n, -333333]);
	});

	it("throws outside the exponent limit", () => {
		// Values beyond the limit cannot be constructed in the first place.
		expect(() => cbrt([1n, 3000000])).toThrow(RangeError);
		expect(() => cbrt([1n, 3000000])).toThrow("exponent out of range");
		expect(() => cbrt([1n, -3000000])).toThrow(RangeError);
	});
});

describe("cbrt options", () => {
	it("overrides precision and rounding for one call", () => {
		expect(new Decimal(2).cbrt({ precision: 5 }).toString()).toBe("1.2599");
		expect(
			new Decimal(2).cbrt({ precision: 5, rounding: "up" }).toString(),
		).toBe("1.26");
	});
});
