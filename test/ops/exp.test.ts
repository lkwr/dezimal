import type { RoundingMode } from "dezimal";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/exp.ts";
import "../../src/format/to-string.ts";

/** Runs `exp` and returns the normalized raw [coefficient, exponent] tuple. */
const exp = (value: DecimalLike): RawDecimal => new Decimal(value).exp().raw;

describe("exp", () => {
	it("returns e for an argument of one", () => {
		expect(exp(1)).toEqual([27182818284590452354n, -19]);
		expect(new Decimal(1).exp().toString()).toBe("2.7182818284590452354");
	});

	it("matches the known expansions at the 20 default digits (half-up)", () => {
		// 21st digit 3 -> keep.
		expect(new Decimal(2).exp().toString()).toBe("7.3890560989306502272");
		// 21st digit 4 -> keep.
		expect(new Decimal("0.5").exp().toString()).toBe("1.6487212707001281468");
		// 21st digits 5|52 -> up; the carry's trailing zero normalizes away.
		expect(new Decimal(-1).exp().toString()).toBe("0.3678794411714423216");
		// 21st digit 3 -> keep; the trailing zero normalizes away.
		expect(new Decimal("-0.5").exp().toString()).toBe("0.6065306597126334236");
	});

	it("returns exactly one for a zero argument, whatever the mode", () => {
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
				expect(exp(0)).toEqual([1n, 0]);
				expect(exp("-0")).toEqual([1n, 0]);
			}
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("honors `Decimal.precision`", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 5;
			// The discarded fraction (0.81828...) is above half.
			expect(exp(1)).toEqual([27183n, -4]);
			expect(new Decimal(1).exp().toString()).toBe("2.7183");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("keeps 60 significant digits", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 60;
			// 61st digit 7 -> up.
			expect(new Decimal(2).exp().toString()).toBe(
				"7.38905609893065022723042746057500781318031557055184732408713",
			);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("applies every rounding mode away from a tie", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 5;
			// e^-1 = 0.367879441...: the fraction past the 5-digit truncation
			// 0.36787 is 0.944117..., above half, so only down/floor keep it.
			const expectations: [RoundingMode, string][] = [
				["half-up", "0.36788"],
				["half-even", "0.36788"],
				["half-down", "0.36788"],
				["up", "0.36788"],
				["down", "0.36787"],
				["half-ceil", "0.36788"],
				["half-floor", "0.36788"],
				["ceil", "0.36788"],
				["floor", "0.36787"],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				expect(new Decimal(-1).exp().toString()).toBe(expected);
			}
			// down keeps the truncation's full five digits.
			Decimal.rounding = "down";
			expect(new Decimal(-1).exp().raw).toEqual([36787n, -5]);
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("breaks a near-half landing with the guard digits", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 1;
			// ln(2.5) truncated one digit early: the true value 2.4999999...
			// sits just under the 2|3 midpoint, so every nearest mode keeps 2,
			// while up/ceil still move away from the discarded tail.
			const expectations: [RoundingMode, string][] = [
				["half-up", "2"],
				["half-even", "2"],
				["half-down", "2"],
				["up", "3"],
				["down", "2"],
				["half-ceil", "2"],
				["half-floor", "2"],
				["ceil", "3"],
				["floor", "2"],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				expect(new Decimal("0.916290731874155").exp().toString()).toBe(
					expected,
				);
			}
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("carries into a fresh power of ten when rounding up", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 1;
			// e^2.27 = 9.67940...: one significant digit at half-up reaches 1e1.
			Decimal.rounding = "half-up";
			expect(new Decimal("2.27").exp().raw).toEqual([1n, 1]);
			// down truncates instead.
			Decimal.rounding = "down";
			expect(new Decimal("2.27").exp().raw).toEqual([9n, 0]);
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(1);
		const expected = [27182818284590452354n, -19] satisfies RawDecimal;
		expect(exp(self)).toEqual(expected);
		expect(exp("1")).toEqual(expected);
		expect(exp(1)).toEqual(expected);
		expect(exp(1n)).toEqual(expected);
		expect(exp([1n, 0] satisfies RawDecimal)).toEqual(expected);
	});

	it("throws on a certainly overflowing argument", () => {
		expect(() => exp("1e7")).toThrow(RangeError);
		expect(() => exp("1e7")).toThrow("exponent out of range");
		expect(() => exp([1n, 999999])).toThrow(RangeError);
	});

	it("throws on a certainly underflowing argument", () => {
		// |x| beyond (limit + 1)·ln(10) is out of range in both directions.
		expect(() => exp("-1e7")).toThrow(RangeError);
		expect(() => exp([-1n, 999999])).toThrow(RangeError);
	});

	it("throws when the computed result underflows the exponent limit", () => {
		// e^-2302584 = 10^-999999.52..., a decade past the smallest value:
		// caught by the final exponent-field guard after the reduction.
		expect(() => exp("-2302584")).toThrow(RangeError);
		expect(() => exp("-2302584")).toThrow("exponent out of range");
	});

	it("stays inside the exponent limit near its edges", () => {
		// e^1000000 = 3.0332153968020875451e+434294; 21st digit 8 -> up.
		expect(new Decimal("1e6").exp().raw).toEqual([
			30332153968020875451n,
			434275,
		]);
		// e^2302585 = 9.1119892584631477660e+999999, the last representable
		// decade; 21st digit 2 -> keep, trailing zero normalizes away.
		expect(new Decimal("2302585").exp().raw).toEqual([
			9111989258463147766n,
			999981,
		]);
	});

	it("collapses astronomically small arguments to one", () => {
		expect(exp([1n, -999999])).toEqual([1n, 0]);
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			expect(() => exp(1)).toThrow(RangeError);
			expect(() => exp(1)).toThrow("expected a positive integer");
		} finally {
			Decimal.precision = precision;
		}
	});
});

describe("exp options", () => {
	it("overrides precision and rounding for one call", () => {
		expect(new Decimal(1).exp({ precision: 5 }).toString()).toBe("2.7183");
		expect(
			new Decimal(1).exp({ precision: 5, rounding: "down" }).toString(),
		).toBe("2.7182");
	});
});
