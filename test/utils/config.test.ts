import type { RoundingMode } from "dezi";
import { afterEach, describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import { currentPrecision, currentRounding } from "../../src/utils/config.ts";

describe("currentPrecision", () => {
	const initial = Decimal.precision;
	afterEach(() => {
		Decimal.precision = initial;
	});

	it("returns the configured precision", () => {
		Decimal.precision = 7;
		expect(currentPrecision()).toBe(7);
	});

	it("prefers the per-call override", () => {
		Decimal.precision = 7;
		expect(currentPrecision(30)).toBe(30);
	});

	it("rejects anything but a positive integer", () => {
		for (const invalid of [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() => currentPrecision(invalid)).toThrow(RangeError);
			Decimal.precision = invalid;
			expect(() => currentPrecision()).toThrow(RangeError);
		}
	});
});

describe("currentRounding", () => {
	const initial = Decimal.rounding;
	afterEach(() => {
		Decimal.rounding = initial;
	});

	it("returns the configured mode or the per-call override", () => {
		Decimal.rounding = "floor";
		expect(currentRounding()).toBe("floor");
		expect(currentRounding("half-even")).toBe("half-even");
	});

	it("rejects unknown modes", () => {
		const invalid = "nearest" as RoundingMode;
		expect(() => currentRounding(invalid)).toThrow(RangeError);
		expect(() => currentRounding("toString" as RoundingMode)).toThrow(
			RangeError,
		);
		Decimal.rounding = invalid;
		expect(() => currentRounding()).toThrow(RangeError);
	});
});
