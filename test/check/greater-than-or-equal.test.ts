import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/greater-than-or-equal.ts";

describe("greaterThanOrEqual (instance)", () => {
	it("returns true when the value is greater than or equal to other", () => {
		expect(new Decimal("2.5").greaterThanOrEqual(2)).toBe(true);
		expect(new Decimal(3).greaterThanOrEqual("2.5")).toBe(true);
		expect(
			new Decimal("1e20").greaterThanOrEqual("12345678901234567890.12"),
		).toBe(true);
		expect(new Decimal("2.5").greaterThanOrEqual(2.5)).toBe(true);
	});

	it("returns false when the value is less than other", () => {
		expect(new Decimal("1.5").greaterThanOrEqual(2)).toBe(false);
		expect(new Decimal("9.99").greaterThanOrEqual("10")).toBe(false);
		expect(
			new Decimal("1e20").greaterThanOrEqual("123456789012345678901.2"),
		).toBe(false);
	});

	it("returns true for equal values with different representations", () => {
		expect(new Decimal("1.10").greaterThanOrEqual("1.1")).toBe(true);
		expect(
			new Decimal("1e20").greaterThanOrEqual(100_000_000_000_000_000_000n),
		).toBe(true);
		expect(new Decimal("0").greaterThanOrEqual("0.0")).toBe(true);
	});

	it("handles negative and zero operands", () => {
		expect(new Decimal("-1.5").greaterThanOrEqual(-3)).toBe(true);
		expect(new Decimal("-1.5").greaterThanOrEqual(0)).toBe(false);
		expect(new Decimal("0").greaterThanOrEqual("-0.5")).toBe(true);
		expect(new Decimal("-3").greaterThanOrEqual("-1.5")).toBe(false);
	});

	it("accepts DecimalLike arguments", () => {
		expect(new Decimal("2").greaterThanOrEqual("2")).toBe(true);
		expect(new Decimal("2").greaterThanOrEqual(2)).toBe(true);
		expect(new Decimal("2").greaterThanOrEqual(2n)).toBe(true);
		expect(new Decimal("2").greaterThanOrEqual(new Decimal("2"))).toBe(true);
		expect(new Decimal("2").greaterThanOrEqual([2n, 0])).toBe(true);
	});

	it("throws on invalid input", () => {
		expect(() => new Decimal("1").greaterThanOrEqual("x")).toThrow(TypeError);
		expect(() =>
			new Decimal("1").greaterThanOrEqual({} as unknown as never),
		).toThrow(TypeError);
	});
});

describe("gte (alias)", () => {
	it("behaves like greaterThanOrEqual", () => {
		expect(new Decimal("2.5").gte(2)).toBe(true);
		expect(new Decimal("2.5").gte("3")).toBe(false);
		expect(new Decimal("1.10").gte("1.1")).toBe(true);
		expect(new Decimal("-1.5").gte(-3)).toBe(true);
	});

	it("registers the alias as the same function on the prototype", () => {
		expect(Decimal.prototype.greaterThanOrEqual).toBe(Decimal.prototype.gte);
	});
});
