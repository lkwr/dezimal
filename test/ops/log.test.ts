import type { RoundingMode } from "dezimal";
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

	it("is correctly rounded", () => {
		// Reference digits: the exact logarithms rounded half-up at 20 digits.
		const cases: [DecimalLike, DecimalLike, string][] = [
			[5, 10n, "0.69897000433601880479"],
			[12, 10n, "1.0791812460476248277"],
			["0.3", 10n, "-0.5228787452803375627"],
			[3, 2n, "1.5849625007211561815"],
			[100, 2n, "6.6438561897747246957"],
			[2, 10n, "0.30102999566398119521"],
		];
		for (const [value, base, expected] of cases) {
			expect(new Decimal(value).log(base).toString()).toBe(expected);
		}
		expect(Decimal.log2(3).raw).toEqual(new Decimal(3).log(2n).raw);
	});
	it("keeps exact results exact in every mode", () => {
		const rounding = Decimal.rounding;
		try {
			for (const mode of ["up", "down", "ceil", "floor"] as const) {
				Decimal.rounding = mode;
				expect(new Decimal(8).log(2n).raw).toEqual([3n, 0]);
				expect(new Decimal("0.001").log().raw).toEqual([-3n, 0]);
				expect(new Decimal(8).log(4n).raw).toEqual([15n, -1]);
			}
		} finally {
			Decimal.rounding = rounding;
		}
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

	it("stays exact across a deep ln reduction chain", () => {
		expect(new Decimal("1e999999").log().raw).toEqual([999999n, 0]);
		expect(new Decimal("1.234e999999").log().toString()).toBe(
			"999999.09131515969722",
		);
		expect(Decimal.log2("1e999999").toString()).toBe("3321924.7729592674605");
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
			// log2(3) = 1.58496.. rounds to 1.5850 at 5 digits.
			expect(Decimal.log2(3).raw).toEqual([1585n, -3]);
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
			// log10(7) = 0.84509804..: only the final rounding sees the mode.
			Decimal.rounding = "up";
			expect(new Decimal(7).log().toString()).toBe("0.8451");
			Decimal.rounding = "down";
			expect(new Decimal(7).log().toString()).toBe("0.84509");
			Decimal.rounding = "half-up";
			expect(new Decimal(7).log().toString()).toBe("0.8451");
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

describe("log options", () => {
	it("overrides precision and rounding for one call", () => {
		expect(new Decimal(2).log(10, { precision: 5 }).toString()).toBe("0.30103");
		expect(
			new Decimal(2)
				.log(undefined, { precision: 5, rounding: "down" })
				.toString(),
		).toBe("0.30102");
		expect(Decimal.log2(10, { precision: 5 }).toString()).toBe("3.3219");
		expect(Decimal.log10(2, { precision: 3 }).toString()).toBe("0.301");
	});
});
