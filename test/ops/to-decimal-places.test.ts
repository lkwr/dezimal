import type { RoundingMode } from "dezi";
import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/ops/to-decimal-places.ts";
import "../../src/format/to-string.ts";

describe("toDecimalPlaces", () => {
	it("rounds to the given number of decimal places", () => {
		expect(new Decimal("1.23456").toDP(2).toString()).toBe("1.23");
		expect(new Decimal("1.23456").toDecimalPlaces(0).toString()).toBe("1");
		// Values already on the grid pass through without trailing-zero padding.
		expect(new Decimal("1.2").toDP(3).toString()).toBe("1.2");
	});

	it("returns the same instance without dp", () => {
		const value = new Decimal("1.23456");
		expect(value.toDP()).toBe(value);
		expect(value.toDecimalPlaces()).toBe(value);
		// The mode is irrelevant when dp is omitted.
		expect(value.toDP(undefined, "floor")).toBe(value);
	});

	it("breaks ties at the dp boundary with an explicit mode", () => {
		const expectations: [RoundingMode, string][] = [
			["half-up", "1.3"],
			["half-even", "1.2"],
			["half-down", "1.2"],
		];
		for (const [mode, expected] of expectations) {
			// 1.25 splits exactly halfway between 1.2 and 1.3.
			expect(new Decimal("1.25").toDP(1, mode).toString()).toBe(expected);
		}
	});

	it("uses the configured `Decimal.rounding` at a tie", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "half-even";
			expect(new Decimal("1.25").toDP(1).toString()).toBe("1.2");
			Decimal.rounding = "half-down";
			expect(new Decimal("1.25").toDP(1).toString()).toBe("1.2");
			Decimal.rounding = "half-up";
			expect(new Decimal("1.25").toDP(1).toString()).toBe("1.3");
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("rounds negative values", () => {
		expect(new Decimal("-1.23456").toDP(2).toString()).toBe("-1.23");
		expect(new Decimal("-1.236").toDP(2).toString()).toBe("-1.24");
		// half-up ties away from zero
		expect(new Decimal("-1.25").toDP(1).toString()).toBe("-1.3");
		expect(new Decimal("-1.25").toDP(1, "half-even").toString()).toBe("-1.2");
		expect(new Decimal("-1.25").toDP(1, "half-down").toString()).toBe("-1.2");
	});

	it("rounds zero to zero", () => {
		expect(new Decimal(0).toDP(2).toString()).toBe("0");
		expect(new Decimal("-0.0001").toDP(2).toString()).toBe("0");
	});

	it("keeps huge dp cheap as a no-op", () => {
		const value = new Decimal("1.5");
		expect(value.toDP(1e9).toString()).toBe("1.5");
		expect(value.toDP(Number.MAX_SAFE_INTEGER).toString()).toBe("1.5");
	});

	it("throws RangeError on invalid dp", () => {
		expect(() => new Decimal("1.25").toDP(-1)).toThrowError(
			"Invalid decimal places: expected a non-negative integer, got -1",
		);
		expect(() => new Decimal("1.25").toDP(1.5)).toThrowError(RangeError);
		expect(() => new Decimal("1.25").toDP(NaN)).toThrowError(RangeError);
		expect(() => new Decimal("1.25").toDP(Infinity)).toThrowError(RangeError);
	});

	it("exposes toDP as an alias", () => {
		const value = new Decimal("1.23456");
		expect(value.toDP(2).raw).toEqual(value.toDecimalPlaces(2).raw);
		expect(value.toDP(2).toString()).toBe("1.23");
	});
});
