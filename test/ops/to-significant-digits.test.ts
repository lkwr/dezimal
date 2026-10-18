import type { RoundingMode } from "dezimal";
import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/to-significant-digits.ts";
import "../../src/ops/to-decimal-places.ts";
import "../../src/config/precision.ts";
import "../../src/format/to-string.ts";

/** Runs `toSignificantDigits` and returns the raw [coefficient, exponent] tuple. */
const sig = (
	value: DecimalLike,
	sd?: number,
	mode?: RoundingMode,
): RawDecimal => new Decimal(value).toSignificantDigits(sd, mode).raw;

describe("toSignificantDigits", () => {
	it("rounds to the given number of significant digits", () => {
		// 999 to 2 digits rounds up and carries into a fresh power of ten.
		expect(sig("999", 2)).toEqual([1n, 3]);
		expect(new Decimal("999").toSD(2).toString()).toBe("1000");
		// 999.96 to 3 digits: last kept digit 9 absorbs the 96 tail as a carry.
		expect(sig("999.96", 3)).toEqual([1n, 3]);
		// 0.000999 to 2 digits: the carry moves the result up to 0.001.
		expect(sig("0.000999", 2)).toEqual([1n, -3]);
		expect(new Decimal("0.000999").toSignificantDigits(2).toString()).toBe(
			"0.001",
		);
		expect(sig("123456", 4)).toEqual([1235n, 2]);
	});

	it("breaks ties at the tie digit with an explicit mode", () => {
		// 1.05 to 2 significant digits splits exactly halfway between 1.0 and 1.1.
		const expectations: [RoundingMode, RawDecimal][] = [
			["half-up", [11n, -1]],
			["half-down", [1n, 0]],
			["half-even", [1n, 0]],
			["up", [11n, -1]],
			["down", [1n, 0]],
			["ceil", [11n, -1]],
			["floor", [1n, 0]],
			["half-ceil", [11n, -1]],
			["half-floor", [1n, 0]],
		];
		for (const [mode, expected] of expectations) {
			expect(sig("1.05", 2, mode)).toEqual(expected);
		}
		expect(
			new Decimal("1.05").toSignificantDigits(2, "half-up").toString(),
		).toBe("1.1");
	});

	it("rounds negative values with the mode deciding the tie side", () => {
		// -1.05 to 2 significant digits: half-up ties away from zero.
		const expectations: [RoundingMode, RawDecimal][] = [
			["half-up", [-11n, -1]],
			["half-down", [-1n, 0]],
			["half-even", [-1n, 0]],
			["up", [-11n, -1]],
			["down", [-1n, 0]],
			["ceil", [-1n, 0]],
			["floor", [-11n, -1]],
			["half-ceil", [-1n, 0]],
			["half-floor", [-11n, -1]],
		];
		for (const [mode, expected] of expectations) {
			expect(sig("-1.05", 2, mode)).toEqual(expected);
		}
		expect(
			new Decimal("-1.05").toSignificantDigits(2, "floor").toString(),
		).toBe("-1.1");
	});

	it("uses the configured `Decimal.rounding` at a tie", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "half-even";
			expect(sig("1.05", 2)).toEqual([1n, 0]);
			Decimal.rounding = "half-down";
			expect(sig("1.05", 2)).toEqual([1n, 0]);
			Decimal.rounding = "half-up";
			expect(sig("1.05", 2)).toEqual([11n, -1]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("leaves values with the requested digit count unchanged", () => {
		// Already on the sd grid: exact tuple equality, no re-shaping.
		expect(sig("1.23", 3)).toEqual([123n, -2]);
		// Trailing zeros are normalized away on parse, so "12.00" is 12.
		expect(sig("12.00", 2)).toEqual([12n, 0]);
		// sd above the coefficient's digit count is a no-op as well.
		expect(sig("1.5", 10)).toEqual([15n, -1]);
		// Huge grids stay cheap via the on-grid early return.
		expect(sig("1e20", 1)).toEqual([1n, 20]);
	});

	it("rounds zero to zero", () => {
		expect(sig(0, 5)).toEqual([0n, 0]);
		// Zero has no signed form: "-0" is [0n, 0] too.
		expect(sig("-0", 3)).toEqual([0n, 0]);
	});

	it("throws RangeError on invalid sd", () => {
		expect(() => new Decimal("1.05").toSignificantDigits(0)).toThrowError(
			"Invalid significant digits: expected a positive integer, got 0",
		);
		expect(() => new Decimal("1.05").toSD(-1)).toThrowError(
			"Invalid significant digits: expected a positive integer, got -1",
		);
		expect(() => new Decimal("1.05").toSignificantDigits(1.5)).toThrowError(
			RangeError,
		);
		expect(() => new Decimal("1.05").toSignificantDigits(NaN)).toThrowError(
			RangeError,
		);
		expect(() =>
			new Decimal("1.05").toSignificantDigits(Infinity),
		).toThrowError(RangeError);
	});

	it("returns the same value without sd", () => {
		const value = new Decimal("1.23456");
		expect(value.toSignificantDigits()).toBe(value);
		expect(value.toSD()).toBe(value);
		// The mode is irrelevant when sd is omitted.
		expect(value.toSignificantDigits(undefined, "floor")).toBe(value);
		// Same convention as an omitted dp in toDecimalPlaces.
		expect(value.toSignificantDigits().raw).toEqual(
			value.toDecimalPlaces().raw,
		);
	});

	it("exposes toSD as an alias", () => {
		const value = new Decimal("125");
		expect(value.toSD(2).raw).toEqual(value.toSignificantDigits(2).raw);
		expect(value.toSD(2).toString()).toBe("130");
	});

	it("accepts every DecimalLike receiver form", () => {
		expect(sig(999n, 2)).toEqual([1n, 3]);
		expect(sig(999, 2)).toEqual([1n, 3]);
		expect(sig([999n, 0], 2)).toEqual([1n, 3]);
	});

	it("does not involve Decimal.precision", () => {
		// Exact quantize family: the result must not depend on the configured
		// precision, no matter how aggressively it is tightened.
		const precision = Decimal.precision;
		try {
			Decimal.precision = 1;
			expect(sig("999.96", 3)).toEqual([1n, 3]);
			expect(sig("1.23", 3)).toEqual([123n, -2]);
		} finally {
			Decimal.precision = precision;
		}
	});
});
