import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/is-positive.ts";

describe("isPositive", () => {
	it("returns true for positive values", () => {
		expect(new Decimal("5").isPositive()).toBe(true);
		expect(new Decimal("5.0").isPositive()).toBe(true);
		expect(new Decimal(5n).isPositive()).toBe(true);
		expect(new Decimal("1e-3").isPositive()).toBe(true);
		expect(new Decimal(0.25).isPositive()).toBe(true);
	});

	it("returns false for zero", () => {
		expect(new Decimal(0).isPositive()).toBe(false);
		// any zero spelling normalizes to [0n, 0]
		expect(new Decimal("0.0").isPositive()).toBe(false);
		expect(new Decimal("0e10").isPositive()).toBe(false);
		expect(new Decimal("-0").isPositive()).toBe(false);
	});

	it("returns false for negative values", () => {
		expect(new Decimal("-5").isPositive()).toBe(false);
		expect(new Decimal("-1e-3").isPositive()).toBe(false);
		expect(new Decimal(-0.25).isPositive()).toBe(false);
	});

	it("exposes isPos as an alias", () => {
		expect(new Decimal("5").isPos()).toBe(true);
		expect(new Decimal(0).isPos()).toBe(false);
		expect(new Decimal("-5").isPos()).toBe(false);
	});
});
