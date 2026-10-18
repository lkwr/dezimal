import type { RoundingMode } from "dezimal";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/to-nearest.ts";
import "../../src/format/to-string.ts";
import "../../src/config/precision.ts";

/**
 * Runs `toNearest` and returns the normalized raw [coefficient, exponent]
 * tuple.
 */
const toNearest = (
	value: DecimalLike,
	base: DecimalLike,
	mode?: RoundingMode,
): RawDecimal => new Decimal(value).toNearest(base, mode).raw;

describe("toNearest", () => {
	it("snaps onto the nearest multiple of the base", () => {
		// 4.4 / 0.5 = 8.8 -> k = 9 at half-up -> 4.5
		expect(toNearest("4.4", "0.5")).toEqual([45n, -1]);
		expect(new Decimal("4.4").toNearest("0.5").toString()).toBe("4.5");
		// 4.4 / 2 = 2.2 -> k = 2 -> 4
		expect(toNearest("4.4", 2)).toEqual([4n, 0]);
		// 4.4 / 0.05 = 88 exactly: already on the grid
		expect(toNearest("4.4", "0.05")).toEqual([44n, -1]);
	});

	it("leaves exact multiples unchanged in every mode", () => {
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
		for (const mode of modes) {
			expect(toNearest("4.4", "0.05", mode)).toEqual([44n, -1]);
			expect(toNearest("-4.4", "0.05", mode)).toEqual([-44n, -1]);
		}
	});

	it("breaks the half-quotient tie per mode", () => {
		// 1.25 / 0.5 = 2.5 ties between k = 2 (-> 1) and k = 3 (-> 1.5)
		const tie: [RoundingMode, RawDecimal][] = [
			["half-up", [15n, -1]],
			["half-down", [1n, 0]],
			["half-even", [1n, 0]],
			["up", [15n, -1]],
			["down", [1n, 0]],
			["ceil", [15n, -1]],
			["floor", [1n, 0]],
			["half-ceil", [15n, -1]],
			["half-floor", [1n, 0]],
		];
		for (const [mode, expected] of tie) {
			expect(toNearest("1.25", "0.5", mode)).toEqual(expected);
		}
		// half-even jumps to the even quotient when the truncated one is odd:
		// 1.75 / 0.5 = 3.5 -> k = 4 -> 2
		expect(toNearest("1.75", "0.5", "half-even")).toEqual([2n, 0]);
	});

	it("defaults to the Decimal.rounding mode", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "down";
			expect(toNearest("1.25", "0.5")).toEqual([1n, 0]);
			Decimal.rounding = "half-up";
			expect(toNearest("1.25", "0.5")).toEqual([15n, -1]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("rounds a negative value by the quotient's sign", () => {
		// -4.4 / 0.5 = -8.8: k is negative, so ceil stops at k = -8 -> -4,
		// floor continues to k = -9 -> -4.5, and half-up ties away from zero.
		expect(new Decimal("-4.4").toNearest("0.5").toString()).toBe("-4.5");
		expect(toNearest("-4.4", "0.5", "ceil")).toEqual([-4n, 0]);
		expect(toNearest("-4.4", "0.5", "floor")).toEqual([-45n, -1]);
		expect(toNearest("-4.4", "0.5", "down")).toEqual([-4n, 0]);
		expect(toNearest("-4.4", "0.5", "up")).toEqual([-45n, -1]);
		// with a positive value the familiar directions apply
		expect(toNearest("4.4", 1, "ceil")).toEqual([5n, 0]);
		expect(toNearest("4.4", 1, "floor")).toEqual([4n, 0]);
	});

	it("resolves a negative quotient's ties per mode", () => {
		// -1.25 / 0.5 = -2.5 ties between k = -2 (-> -1) and k = -3 (-> -1.5)
		const tie: [RoundingMode, RawDecimal][] = [
			["half-up", [-15n, -1]],
			["half-down", [-1n, 0]],
			["half-even", [-1n, 0]],
			["up", [-15n, -1]],
			["down", [-1n, 0]],
			["ceil", [-1n, 0]],
			["floor", [-15n, -1]],
			["half-ceil", [-1n, 0]],
			["half-floor", [-15n, -1]],
		];
		for (const [mode, expected] of tie) {
			expect(toNearest("-1.25", "0.5", mode)).toEqual(expected);
		}
	});

	it("rounds the quotient, not the value, for a negative base", () => {
		// 4.4 / -1 = -4.4: k is negative, so ceil stops at k = -4 and lands on
		// the mirror of the positive base's floor case, while floor continues
		// to k = -5.
		expect(toNearest("4.4", "-1")).toEqual([4n, 0]);
		expect(toNearest("4.4", "-1", "ceil")).toEqual([4n, 0]);
		expect(toNearest("4.4", "-1", "floor")).toEqual([5n, 0]);
		expect(toNearest("4.4", "-1", "up")).toEqual([5n, 0]);
		expect(toNearest("4.4", "-1", "down")).toEqual([4n, 0]);
		// -4.4 / -0.5 = 8.8: a positive quotient, so ceil rounds it up to -4.5
		expect(toNearest("-4.4", "-0.5", "ceil")).toEqual([-45n, -1]);
		expect(toNearest("-4.4", "-0.5", "floor")).toEqual([-4n, 0]);
	});

	it("breaks a negative base's ties on the quotient", () => {
		// 1.25 / -0.5 = -2.5 ties between k = -2 (-> 1) and k = -3 (-> 1.5)
		const tie: [RoundingMode, RawDecimal][] = [
			["half-up", [15n, -1]],
			["half-down", [1n, 0]],
			["half-even", [1n, 0]],
			["up", [15n, -1]],
			["down", [1n, 0]],
			["ceil", [1n, 0]],
			["floor", [15n, -1]],
			["half-ceil", [1n, 0]],
			["half-floor", [15n, -1]],
		];
		for (const [mode, expected] of tie) {
			expect(toNearest("1.25", "-0.5", mode)).toEqual(expected);
		}
	});

	it("collapses k = 0 to zero", () => {
		// 0.2 / 1 = 0.2: below half, so half-up keeps k = 0
		expect(toNearest("0.2", 1)).toEqual([0n, 0]);
		// up increments on any discarded part, landing on k = 1
		expect(toNearest("0.2", 1, "up")).toEqual([1n, 0]);
		expect(toNearest("0.2", 1, "down")).toEqual([0n, 0]);
	});

	it("returns zero for a zero value", () => {
		expect(toNearest(0, "0.5")).toEqual([0n, 0]);
		expect(toNearest("0.00", "3")).toEqual([0n, 0]);
		expect(toNearest("0e999999", "3")).toEqual([0n, 0]);
	});

	it("throws on a zero base", () => {
		expect(() => new Decimal("4.4").toNearest(0)).toThrow(RangeError);
		expect(() => new Decimal("4.4").toNearest(0)).toThrow("division by zero");
		expect(() => new Decimal("4.4").toNearest("0.00")).toThrow(RangeError);
		expect(() => new Decimal(0).toNearest(0)).toThrow(RangeError);
	});

	it("stays inside the exponent limit", () => {
		// 9.5e999999 / 1e999999 = 9.5 ties: half-up's k = 10 lands on
		// 1e1000000, one step past the ±999999 field edge
		expect(() => new Decimal("9.5e999999").toNearest("1e999999")).toThrow(
			RangeError,
		);
		expect(() => new Decimal("9.5e999999").toNearest("1e999999")).toThrow(
			"Decimal exponent out of range (±999999): 1000000",
		);
		// down stops at k = 9, keeping 9e999999 inside the field
		expect(toNearest("9.5e999999", "1e999999", "down")).toEqual([9n, 999999]);
	});

	// 51 significant digits render in exponential form, so exactness is
	// asserted on the raw [coefficient, exponent] tuple
	it("returns the exact product k × base, at any width", () => {
		const wide = 10n ** 50n - 1n; // the 50-digit base 999…9
		const value = `${(5n * wide) / 2n}.5`; // 2.5 × base: an exact half tie
		// half-up rounds the tied 2.5 to k = 3: 3 × base keeps all 51 digits
		expect(new Decimal(value).toNearest(wide.toString()).raw).toEqual([
			3n * wide,
			0,
		]);
		// half-even keeps the even k = 2, and the product is still exact
		expect(
			new Decimal(value).toNearest(wide.toString(), "half-even").raw,
		).toEqual([2n * wide, 0]);
	});

	it("stays exact for a base wider than any precision", () => {
		// 123.456789 / 100.000000001 ≈ 1.2345 -> k = 1 -> the base itself
		expect(new Decimal("123.456789").toNearest("100.000000001").raw).toEqual([
			100000000001n,
			-9,
		]);
		expect(
			new Decimal("123.456789").toNearest("100.000000001").toString(),
		).toBe("100.000000001");
	});

	it("never consults Decimal.precision", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 1;
			// 8.8 -> 9 at half-up: exact, not trimmed to 1 significant digit
			expect(toNearest("4.4", "0.5")).toEqual([45n, -1]);
			// the tie still resolves to 1.5 and the wide base stays whole
			expect(toNearest("1.25", "0.5")).toEqual([15n, -1]);
			expect(new Decimal("123.456789").toNearest("100.000000001").raw).toEqual([
				100000000001n,
				-9,
			]);
		} finally {
			Decimal.precision = precision;
		}
	});

	it("accepts every DecimalLike input in both operand positions", () => {
		const self = new Decimal("4.4");
		const half = new Decimal("0.5");
		expect(self.toNearest(half).raw).toEqual([45n, -1]);
		expect(self.toNearest("0.5").raw).toEqual([45n, -1]);
		expect(toNearest(self, half)).toEqual([45n, -1]);
		expect(toNearest("4.4", half)).toEqual([45n, -1]);
		expect(toNearest(4.4, half)).toEqual([45n, -1]);
		expect(toNearest([44n, -1] satisfies RawDecimal, half)).toEqual([45n, -1]);
		expect(toNearest("4.4", 2)).toEqual([4n, 0]);
		expect(toNearest("4.4", 2n)).toEqual([4n, 0]);
		expect(toNearest("4.4", [5n, -1] satisfies RawDecimal)).toEqual([45n, -1]);
	});

	it("registers no aliases", () => {
		// decimal.js also answers to `toClosest`; dezimal keeps a single name
		const instance = new Decimal(1) as unknown as {
			toNearest?: unknown;
			toClosest?: unknown;
			nearest?: unknown;
		};
		expect(instance.toNearest).toBeTypeOf("function");
		expect(instance.toClosest).toBeUndefined();
		expect(instance.nearest).toBeUndefined();
	});
});
