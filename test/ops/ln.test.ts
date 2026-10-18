import type { RoundingMode } from "dezi";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/ln.ts";
import "../../src/format/to-string.ts";
import "../../src/ops/plus.ts";
import "../../src/ops/minus.ts";
import "../../src/ops/divide.ts";
import "../../src/ops/absolute.ts";

/** Runs `ln` and returns the normalized raw [coefficient, exponent] tuple. */
const ln = (value: DecimalLike): RawDecimal => new Decimal(value).ln().raw;

describe("ln", () => {
	it("matches known expansions at the default precision", () => {
		expect(ln(10)).toEqual([2302585092994045684n, -18]);
		expect(new Decimal(10).ln().toString()).toBe("2.302585092994045684");
		expect(ln(2)).toEqual([69314718055994530942n, -20]);
		expect(new Decimal(2).ln().toString()).toBe("0.69314718055994530942");
		expect(ln(3)).toEqual([10986122886681096914n, -19]);
		expect(new Decimal(3).ln().toString()).toBe("1.0986122886681096914");
		// ln 6 = 1.79175946922805500081..: the 21st digit is 1, so the
		// 20-digit rounding keeps 1.7917594692280550008.
		expect(ln("6")).toEqual([17917594692280550008n, -19]);
		expect(new Decimal("6").ln().toString()).toBe("1.7917594692280550008");
	});

	it("returns exact zero for a receiver of one, whatever the mode", () => {
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
				expect(ln(1)).toEqual([0n, 0]);
			}
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("reduces large receivers through the sqrt chain exactly", () => {
		// ln(1e20) = 20·ln 10 = 46.05170185988091368..: the 21st digit is 3.
		expect(ln("1e20")).toEqual([4605170185988091368n, -17]);
		expect(new Decimal("1e20").ln().toString()).toBe("46.05170185988091368");
		// ln(1e999999) = 999999·ln 10 exercises a ~35-step reduction chain.
		expect(new Decimal("1e999999").ln().toString()).toBe("2302582.79040895269");
	});

	it("reduces tiny receivers through the sqrt chain exactly", () => {
		expect(ln("1e-20")).toEqual([-4605170185988091368n, -17]);
		expect(new Decimal("1e-20").ln().toString()).toBe("-46.05170185988091368");
		expect(ln("0.1")).toEqual([-2302585092994045684n, -18]);
		expect(new Decimal("0.1").ln().toString()).toBe("-2.302585092994045684");
		expect(new Decimal("1e-999999").ln().toString()).toBe(
			"-2302582.79040895269",
		);
	});

	it("handles receivers already close to one", () => {
		// |t| = 9.999e-5, just below the 1e-4 threshold: no reduction.
		expect(ln("1.0002")).toEqual([19998000266626673066n, -23]);
		// |t| = 1.0001e-4, just above the threshold: one reduction.
		expect(ln("0.9998")).toEqual([-20002000266706673068n, -23]);
		// Tiny argument: the quadratic correction t²/3 falls below the final
		// rounding grid, and a nonzero result normalizes past its zeros.
		expect(ln("1.0000000001")).toEqual([99999999995n, -21]);
		expect(new Decimal("1.0000000001").ln().toString()).toBe(
			"9.9999999995e-11",
		);
		// ln(1 + 1e-30): the correction sits 30 orders below the leading term.
		expect(ln("1.000000000000000000000000000001")).toEqual([1n, -30]);
		expect(
			new Decimal("1.000000000000000000000000000001").ln().toString(),
		).toBe("1e-30");
	});

	it("keeps multiplicative identities within a couple of ulps", () => {
		// Each ln is individually correctly rounded, so ln 2 + ln 3 vs ln 6
		// differs only by rounding of the outermost digits.
		const identity = new Decimal("6")
			.ln()
			.minus(new Decimal(2).ln().plus(new Decimal(3).ln()));
		expect(identity.abs().raw).toEqual([2n, -20]);
		// ln(1e999999)/ln(10) vs 999999 ties the deep reduction chain to the
		// short one through division.
		const ratio = new Decimal("1e999999").ln().divide(new Decimal(10).ln());
		expect(ratio.minus(999999n).abs().raw).toEqual([2n, -14]);
	});

	it("throws on a non-positive receiver", () => {
		expect(() => new Decimal(0).ln()).toThrow(RangeError);
		expect(() => new Decimal(0).ln()).toThrow(
			"natural logarithm of a non-positive value",
		);
		expect(() => new Decimal("0.00").ln()).toThrow(RangeError);
		expect(() => new Decimal(-1).ln()).toThrow(RangeError);
		expect(() => new Decimal("-1e100").ln()).toThrow(RangeError);
	});

	it("honors `Decimal.precision`", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 5;
			// ln 2 = 0.6931471805..: the fraction past the 5-digit truncation
			// 0.69314 is 0.718.., above half.
			expect(ln(2)).toEqual([69315n, -5]);
			expect(new Decimal(2).ln().toString()).toBe("0.69315");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("applies every rounding mode away from a tie", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 5;
			// ln 2 = 0.6931471805..: past the 5-digit truncation 0.69314 the
			// discarded fraction is 0.718.., above half; ln 1/2 mirrors it
			// negatively, flipping only the directional modes.
			const expectations: [RoundingMode, string, string][] = [
				["half-up", "0.69315", "-0.69315"],
				["half-even", "0.69315", "-0.69315"],
				["half-down", "0.69315", "-0.69315"],
				["up", "0.69315", "-0.69315"],
				["down", "0.69314", "-0.69314"],
				["half-ceil", "0.69315", "-0.69315"],
				["half-floor", "0.69315", "-0.69315"],
				["ceil", "0.69315", "-0.69314"],
				["floor", "0.69314", "-0.69315"],
			];
			for (const [mode, positive, negative] of expectations) {
				Decimal.rounding = mode;
				expect(new Decimal(2).ln().toString()).toBe(positive);
				expect(new Decimal("0.5").ln().toString()).toBe(negative);
			}
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			expect(() => new Decimal(2).ln()).toThrow(RangeError);
			expect(() => new Decimal(2).ln()).toThrow("expected a positive integer");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("accepts every DecimalLike receiver", () => {
		const expected: RawDecimal = [2302585092994045684n, -18];
		expect(ln(new Decimal(10))).toEqual(expected);
		expect(ln("10")).toEqual(expected);
		expect(ln(10)).toEqual(expected);
		expect(ln(10n)).toEqual(expected);
		expect(ln([10n, 0] satisfies RawDecimal)).toEqual(expected);
	});
});

describe("ln options", () => {
	it("overrides precision and rounding for one call", () => {
		expect(new Decimal(2).ln({ precision: 5 }).toString()).toBe("0.69315");
		expect(
			new Decimal(2).ln({ precision: 5, rounding: "down" }).toString(),
		).toBe("0.69314");
	});
});
