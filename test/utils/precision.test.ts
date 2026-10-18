import { afterEach, describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import { currentPrecision } from "../../src/utils/precision.ts";

describe("currentPrecision", () => {
	const initial = Decimal.precision;
	afterEach(() => {
		Decimal.precision = initial;
	});

	it("returns the configured precision", () => {
		Decimal.precision = 7;
		expect(currentPrecision()).toBe(7);
	});

	it("rejects anything but a positive integer", () => {
		for (const invalid of [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			Decimal.precision = invalid;
			expect(() => currentPrecision()).toThrow(RangeError);
		}
	});
});
