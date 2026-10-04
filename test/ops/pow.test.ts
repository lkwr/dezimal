import type { RoundingMode } from "dezi";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/pow.ts";
import "../../src/ops/sqrt.ts";
import "../../src/ops/minus.ts";
import "../../src/ops/absolute.ts";
import "../../src/format/to-number.ts";
import "../../src/format/to-string.ts";

/** Runs `pow` and returns the normalized raw [coefficient, exponent] tuple. */
const pow = (value: DecimalLike, exponent: DecimalLike): RawDecimal =>
	new Decimal(value).pow(exponent).raw;

describe("pow", () => {
	it("returns exact results for positive integer exponents", () => {
		expect(pow(2, 10)).toEqual([1024n, 0]);
		expect(pow("1.5", 2)).toEqual([225n, -2]);
		expect(pow(2, 60)).toEqual([1152921504606846976n, 0]);
	});

	it("applies the base's sign by the exponent's parity", () => {
		expect(pow("-2", 3)).toEqual([-8n, 0]);
		expect(pow("-2", 2)).toEqual([4n, 0]);
		expect(pow("-2", -3)).toEqual([-125n, -3]);
	});

	it("keeps loop intermediates exact below precision + 8 digits", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 2;
			// 2^10 = 1024 stays exact through the loop (4 digits ≤ precision + 8)
			// and is rounded to 1.0e3 by the final 2-digit rounding.
			expect(pow(2, 10)).toEqual([1n, 3]);
			// 2^60 crosses 10 digits: the last product is truncated to
			// 1152921505 (nearest, tails up on magnitude) and rounds to 1.2e18.
			expect(pow(2, 60)).toEqual([12n, 17]);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("applies every rounding mode when the final rounding bites", () => {
		const precision = Decimal.precision;
		const rounding = Decimal.rounding;
		try {
			Decimal.precision = 2;
			// 2^10 = 1024: 1024 is 24 past the 2-digit truncation 10e2, so
			// away-from-/towards-+Infinity modes reach 11e2, every nearest mode
			// (and floor/down) stays at 1.0e3.
			const expectations: [RoundingMode, RawDecimal][] = [
				["up", [11n, 2]],
				["down", [1n, 3]],
				["ceil", [11n, 2]],
				["floor", [1n, 3]],
				["half-up", [1n, 3]],
				["half-down", [1n, 3]],
				["half-even", [1n, 3]],
				["half-ceil", [1n, 3]],
				["half-floor", [1n, 3]],
			];
			for (const [mode, expected] of expectations) {
				Decimal.rounding = mode;
				expect(pow(2, 10)).toEqual(expected);
			}
		} finally {
			Decimal.precision = precision;
			Decimal.rounding = rounding;
		}
	});

	it("returns one for a zero exponent, whatever the base", () => {
		expect(pow(0, 0)).toEqual([1n, 0]);
		expect(pow("123.45", "0")).toEqual([1n, 0]);
		expect(pow("-2", "0.0")).toEqual([1n, 0]);
	});

	it("returns zero for a positive exponent on zero and throws for negative", () => {
		expect(pow(0, 5)).toEqual([0n, 0]);
		expect(pow(0, "0.5")).toEqual([0n, 0]);
		expect(() => pow(0, -1)).toThrow(RangeError);
		expect(() => pow(0, -1)).toThrow("zero raised to a negative power");
		expect(() => pow(0, "-0.5")).toThrow(RangeError);
	});

	it("returns the receiver itself for a base of one, exact and unrounded", () => {
		const self = new Decimal(1);
		expect(self.pow("1e30")).toBe(self);
		expect(self.pow(-5)).toBe(self);
		// The identity precedes even the precision validation.
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			expect(self.pow("1e30")).toBe(self);
		} finally {
			Decimal.precision = precision;
		}
		// "1.000" normalizes to one, so the identity applies to it as well.
		expect(new Decimal("1.000").pow(3).raw).toEqual([1n, 0]);
	});

	it("rounds the receiver to the precision for an exponent of one", () => {
		expect(pow("2.5", 1)).toEqual([25n, -1]);
		expect(new Decimal("1.234567890123456789012345").pow(1).toString()).toBe(
			"1.234567890123456789",
		);
	});

	it("exposes power as aliases", () => {
		const self = new Decimal(2);
		expect(self.power(10).raw).toEqual(self.pow(10).raw);
	});

	it("returns exact reciprocals for negative integer exponents", () => {
		expect(pow(2, -3)).toEqual([125n, -3]);
		expect(pow(2, -1)).toEqual([5n, -1]);
		expect(pow("0.5", -2)).toEqual([4n, 0]);
	});

	it("rounds non-terminating reciprocals to the default 20 digits", () => {
		// 1/9 rounds down at the 21st digit (…1|1): twenty ones, exact repeat.
		expect(new Decimal(3).pow(-2).toString()).toBe("0.11111111111111111111");
		expect(pow(3, -2)).toEqual([11111111111111111111n, -20]);
	});

	it("computes fractional exponents through the logarithm chain", () => {
		// The chain reproduces the exact root: ln(4)/2 is exact and exp of it
		// rounds back to exactly 2 at 20 digits.
		expect(pow(4, "0.5")).toEqual([2n, 0]);
		expect(new Decimal(4).power("0.5").toString()).toBe("2");
	});

	it("agrees with the square root within 1e-18", () => {
		const delta = new Decimal(2)
			.pow("0.5")
			.minus(new Decimal(2).sqrt())
			.abs()
			.toNumber();
		expect(delta).toBeLessThan(1e-18);
	});

	it("matches the 20-digit fourth root of two", () => {
		expect(pow(2, "0.25")).toEqual([11892071150027210667n, -19]);
		expect(new Decimal(2).pow("0.25").toString()).toBe("1.1892071150027210667");
	});

	it("throws for a negative base with a non-integer exponent", () => {
		expect(() => pow(-2, "0.5")).toThrow(RangeError);
		expect(() => pow(-2, "0.5")).toThrow(
			"negative base with a non-integer exponent",
		);
		expect(() => pow("-2", "1.5")).toThrow(RangeError);
	});

	it("throws when the result estimate leaves the exponent range", () => {
		expect(() => pow(2, "1e9")).toThrow(RangeError);
		expect(() => pow(2, "1e9")).toThrow("exponent out of range");
		expect(() => pow("0.1", "1e9")).toThrow(RangeError);
		expect(() => pow("1.1", "1e30")).toThrow("exponent out of range");
		expect(() => pow("-2", "1e9")).toThrow(RangeError);
	});

	it("stays inside the exponent limit near its edges", () => {
		expect(pow(10, "999999")).toEqual([1n, 999999]);
		expect(pow("-10", 999999)).toEqual([-1n, 999999]);
		// 2^999999 = 4.9503281146479491253e+301029: the loop keeps 28 digits,
		// the final 20-digit rounding decides the last digit.
		expect(pow(2, 999999)).toEqual([49503281146479491253n, 301010]);
	});

	it("throws outside the exponent range on the exact path", () => {
		expect(() => pow(10, 1000000)).toThrow(RangeError);
		expect(() => pow(10, 1000000)).toThrow("exponent out of range");
		expect(() => pow(10, "-1000000")).toThrow(RangeError);
		expect(() => pow("-10", 1000000)).toThrow(RangeError);
	});

	it("chains safe-integer-exceeding integer exponents", () => {
		// ln(1 + 1e-30) · 1.0000000000000001e16 floors to 0, so the estimate
		// passes and the chain decides; y's 17 digits exceed 2^53, so the
		// squaring loop must not run.
		expect(
			new Decimal("1.000000000000000000000000000001").pow("10000000000000001")
				.raw,
		).toEqual([100000000000001n, -14]);
	});

	it("decides the sign of chained huge powers by the exponent's parity", () => {
		// −(1 + 1e-30) with an even exponent beyond 2^53 stays positive, the
		// odd exponent flips the sign of the same chain.
		expect(
			new Decimal("-1.000000000000000000000000000001").pow("10000000000000000")
				.raw,
		).toEqual([100000000000001n, -14]);
		expect(
			new Decimal("-1.000000000000000000000000000001").pow("10000000000000001")
				.raw,
		).toEqual([-100000000000001n, -14]);
	});

	it("honors `Decimal.precision` on the fractional path", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 5;
			expect(new Decimal(2).pow("0.5").raw).toEqual([14142n, -4]);
			expect(new Decimal(2).pow("0.5").toString()).toBe("1.4142");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			// The value-less shortcuts never consult the precision, like ln(1).
			expect(pow(0, 5)).toEqual([0n, 0]);
			expect(pow(5, 0)).toEqual([1n, 0]);
			expect(() => pow(2, 2)).toThrow(RangeError);
			expect(() => pow(2, 2)).toThrow("expected a positive integer");
			// The exponent-one shortcut is precision-based and validates first.
			expect(() => pow(5, 1)).toThrow("expected a positive integer");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("accepts every DecimalLike exponent", () => {
		const self = new Decimal(2);
		const expected = [1024n, 0] satisfies RawDecimal;
		expect(pow(self, 10)).toEqual(expected);
		expect(pow(self, "10")).toEqual(expected);
		expect(pow(self, 10n)).toEqual(expected);
		expect(pow(self, [10n, 0] satisfies RawDecimal)).toEqual(expected);
		expect(pow(self, new Decimal(10))).toEqual(expected);
	});
});
