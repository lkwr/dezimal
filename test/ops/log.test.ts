import type { RoundingMode } from "dezi";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/log.ts";
import "../../src/format/to-string.ts";
import "../../src/ops/minus.ts";
import "../../src/ops/absolute.ts";

/** Runs `log` and returns the normalized raw [coefficient, exponent] tuple. */
const log = (value: DecimalLike, base?: DecimalLike): RawDecimal =>
	new Decimal(value).log(base).raw;

describe("log", () => {
	it("quotients rounded ln results onto exact integers", () => {
		// ln(100), ln(1000), ln(1e20) and ln(1024) each round to an exact
		// multiple of ln(10)'s or ln(2)'s 20-digit rounding, so the quotient
		// has no remainder and the true integer survives the chain.
		expect(log(100)).toEqual([2n, 0]);
		expect(log("1000")).toEqual([3n, 0]);
		expect(log("1e20")).toEqual([2n, 1]);
		expect(log("0.01")).toEqual([-2n, 0]);
		expect(log(1024, 2)).toEqual([1n, 1]);
		expect(Decimal.log2("1024").raw).toEqual([1n, 1]);
		expect(Decimal.log10("1e20").raw).toEqual([2n, 1]);
	});

	it("stays a fraction of an ulp away from the exact logarithm", () => {
		// The ln→divide chain is accurate to a couple of ulps in principle;
		// script-verified against high-precision reference digits, every
		// deviation below stays inside half an ulp of the 20-digit rounding
		// (1e-19 at these magnitudes). Anchors carry 26 true digits.
		const cases: [DecimalLike, DecimalLike, string, RawDecimal][] = [
			[5, 10n, "0.6989700043360188047862611", [37389n, -25]],
			[12, 10n, "1.079181246047624827722505692", [22505692n, -27]],
			["0.3", 10n, "-0.5228787452803375627049721", [49721n, -25]],
			[3, 2n, "1.5849625007211561814537389", [462611n, -25]],
			[100, 2n, "6.6438561897747246957406389", [406389n, -25]],
			[2, 10n, "0.3010299956639811952137389", [62611n, -25]],
		];
		for (const [value, base, expected, deviation] of cases) {
			expect(new Decimal(value).log(base).minus(expected).abs().raw).toEqual(
				deviation,
			);
		}
		expect(Decimal.log2(3).raw).toEqual(new Decimal(3).log(2n).raw);
	});

	it("drifts a single ulp on a boundary-hugging quotient", () => {
		// log2(8) = 3 exactly, but both ln values round up while the true
		// quotient sits ~6e-20 above 3, past the halfway point of the 1e-19
		// last place - so the chain leaves 3.0000000000000000001, still far
		// inside a 1e-17 tolerance.
		expect(new Decimal(8).log(2n).toString()).toBe("3.0000000000000000001");
		expect(new Decimal(8).log(2n).minus(3n).abs().raw).toEqual([1n, -19]);
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
				// ln(1) is exact and a zero dividend short-circuits divide.
				expect(log(1)).toEqual([0n, 0]);
				expect(log(1, 2)).toEqual([0n, 0]);
			}
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("stays sane across a deep ln reduction chain", () => {
		// log10(1e999999) = 999999.0000000000000002: the ~35-step sqrt
		// reduction keeps ln sub-ulp accurate, and the quotient drifts two
		// ulps of 1e-14 (script-verified).
		expect(new Decimal("1e999999").log().minus(999999n).abs().raw).toEqual([
			2n,
			-14,
		]);
		// True value 999999.09131515969722287725920506
		// (= 999999 + log10(1.234)); the error is 1.7e-14.
		expect(
			new Decimal("1.234e999999")
				.log()
				.minus("999999.09131515969722287725920506")
				.abs().raw,
		).toEqual([1712274079494n, -26]);
		// True value 3321924.7729592674605079715592 (= 999999·log2(10));
		// the error is 8e-15, a fraction of the 1e-13 ulp.
		expect(
			Decimal.log2("1e999999").minus("3321924.7729592674605079715592").abs()
				.raw,
		).toEqual([79715592n, -22]);
	});

	it("throws on a non-positive receiver", () => {
		expect(() => log(0)).toThrow(RangeError);
		expect(() => log(0)).toThrow("logarithm of a non-positive value");
		expect(() => log("-5")).toThrow(RangeError);
		expect(() => log("-1e100")).toThrow(RangeError);
		expect(() => log([0n, 0] satisfies RawDecimal)).toThrow(RangeError);
		// The receiver is validated before the base.
		expect(() => log(0, 1)).toThrow("logarithm of a non-positive value");
		// The statics share the receiver validation.
		expect(() => Decimal.log2(0)).toThrow(RangeError);
		expect(() => Decimal.log10("-1")).toThrow(RangeError);
	});

	it("throws on invalid bases", () => {
		expect(() => log(100, 0n)).toThrow(RangeError);
		expect(() => log(100, 0n)).toThrow("logarithm of a non-positive base");
		expect(() => log(100, "-2")).toThrow(RangeError);
		expect(() => log(100, "0.00")).toThrow("logarithm of a non-positive base");
		expect(() => log(100, 1)).toThrow(RangeError);
		expect(() => log(100, 1)).toThrow("logarithm base equal to 1");
		expect(() => log(100, "1.00")).toThrow("logarithm base equal to 1");
	});

	it("honors `Decimal.precision`", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 5;
			// ln(1000) rounds to 6.9078 and ln(10) to 2.3026 at 5 digits, and
			// 6.9078/2.3026 has no remainder: exactly 3, within 1e-4 of 3.0000.
			expect(log(1000)).toEqual([3n, 0]);
			expect(new Decimal(1000).log().toString()).toBe("3");
			expect(new Decimal(1000).log().minus(3n).abs().raw).toEqual([0n, 0]);
			// log2(3) = 1.5849625007211561814537389..: the chained 5-digit
			// result 1.5849 deviates by 6.25e-5, inside the 1e-4 last place.
			expect(Decimal.log2(3).raw).toEqual([15849n, -4]);
			expect(
				Decimal.log2(3).minus("1.5849625007211561814537389").abs().raw,
			).toEqual([625007211561814537389n, -25]);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			// The ln step validates before the divide runs.
			expect(() => log(1000)).toThrow(RangeError);
			expect(() => log(1000)).toThrow("expected a positive integer");
			// The statics validate through the same chain.
			expect(() => Decimal.log2(3)).toThrow(RangeError);
			expect(() => Decimal.log10(2)).toThrow(RangeError);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("inherits the configured rounding mode through the chain", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 5;
			// log10(7) = 0.84509804..: up and down perturb each ln rounding
			// and the final divide, half-up lands nearest.
			Decimal.rounding = "up";
			expect(new Decimal(7).log().toString()).toBe("0.84514");
			Decimal.rounding = "down";
			expect(new Decimal(7).log().toString()).toBe("0.84512");
			Decimal.rounding = "half-up";
			expect(new Decimal(7).log().toString()).toBe("0.84509");
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("accepts every DecimalLike receiver and base", () => {
		const two: RawDecimal = [2n, 0];
		expect(log(new Decimal(100))).toEqual(two);
		expect(log("100")).toEqual(two);
		expect(log(100)).toEqual(two);
		expect(log(100n)).toEqual(two);
		expect(log([100n, 0] satisfies RawDecimal)).toEqual(two);
		expect(log([1n, 2] satisfies RawDecimal)).toEqual(two);

		const ten: RawDecimal = [1n, 1];
		expect(log(1024, 2)).toEqual(ten);
		expect(log(1024, 2n)).toEqual(ten);
		expect(log(1024, "2")).toEqual(ten);
		expect(log(1024, new Decimal(2))).toEqual(ten);
		expect(log(1024, [2n, 0] satisfies RawDecimal)).toEqual(ten);

		expect(Decimal.log2("1024").raw).toEqual(ten);
		expect(Decimal.log2(1024).raw).toEqual(ten);
		expect(Decimal.log2(1024n).raw).toEqual(ten);
		expect(Decimal.log2(new Decimal(1024)).raw).toEqual(ten);
		expect(Decimal.log2([1024n, 0] satisfies RawDecimal).raw).toEqual(ten);
		expect(Decimal.log10("100").raw).toEqual(two);
		expect(Decimal.log10(100).raw).toEqual(two);
		expect(Decimal.log10(100n).raw).toEqual(two);
		expect(Decimal.log10(new Decimal(100)).raw).toEqual(two);
		expect(Decimal.log10([100n, 0] satisfies RawDecimal).raw).toEqual(two);
	});

	it("keeps the default base, log10 and an explicit base 10 identical", () => {
		const expected = log("1e20");
		expect(expected).toEqual([2n, 1]);
		expect(Decimal.log10("1e20").raw).toEqual(expected);
		expect(new Decimal("1e20").log(10n).raw).toEqual(expected);
		expect(new Decimal("1e20").log("10").raw).toEqual(expected);
		expect(new Decimal("1e20").log([1n, 1] satisfies RawDecimal).raw).toEqual(
			expected,
		);
		expect(new Decimal("1e20").log(new Decimal(10)).raw).toEqual(expected);
	});
});
