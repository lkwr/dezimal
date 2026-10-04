import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/is-integer.ts";

describe("isInteger", () => {
	it("returns true for integers", () => {
		expect(new Decimal("5").isInteger()).toBe(true);
		// "5.0" normalizes to [5n, 0]
		expect(new Decimal("5.0").isInteger()).toBe(true);
		expect(new Decimal(5n).isInteger()).toBe(true);
		// "1e20" normalizes to [1n, 20]
		expect(new Decimal("1e20").isInteger()).toBe(true);
	});

	it("returns false for non-integers", () => {
		expect(new Decimal(0.5).isInteger()).toBe(false);
		expect(new Decimal("1e-3").isInteger()).toBe(false);
		expect(new Decimal(0.25).isInteger()).toBe(false);
	});

	it("returns true for zero", () => {
		expect(new Decimal(0).isInteger()).toBe(true);
	});

	it("exposes isInt as an alias", () => {
		expect(new Decimal("5").isInt()).toBe(true);
		expect(new Decimal("0.5").isInt()).toBe(false);
	});
});
