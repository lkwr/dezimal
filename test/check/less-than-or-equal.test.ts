import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/less-than-or-equal.ts";

describe("lessThanOrEqual (instance)", () => {
	it("returns true when the value is less than or equal to other", () => {
		expect(new Decimal("1.5").lessThanOrEqual(2)).toBe(true);
		expect(new Decimal("2").lessThanOrEqual("2.5")).toBe(true);
		expect(new Decimal("12345678901234567890.12").lessThanOrEqual("1e20")).toBe(
			true,
		);
		expect(new Decimal("2.5").lessThanOrEqual(2.5)).toBe(true);
	});

	it("returns false when the value is greater than other", () => {
		expect(new Decimal("2.5").lessThanOrEqual(2)).toBe(false);
		expect(new Decimal("10").lessThanOrEqual("9.99")).toBe(false);
		expect(new Decimal("1e20").lessThanOrEqual("12345678901234567890.12")).toBe(
			false,
		);
	});

	it("returns true for equal values with different representations", () => {
		expect(new Decimal("1.10").lessThanOrEqual("1.1")).toBe(true);
		expect(
			new Decimal("1e20").lessThanOrEqual(100_000_000_000_000_000_000n),
		).toBe(true);
		expect(new Decimal("0").lessThanOrEqual("0.0")).toBe(true);
	});

	it("handles negative and zero operands", () => {
		expect(new Decimal("-1.5").lessThanOrEqual(-3)).toBe(false);
		expect(new Decimal("-1.5").lessThanOrEqual(0)).toBe(true);
		expect(new Decimal("0").lessThanOrEqual("-0.5")).toBe(false);
		expect(new Decimal("-3").lessThanOrEqual("-1.5")).toBe(true);
	});

	it("accepts DecimalLike arguments", () => {
		expect(new Decimal("2").lessThanOrEqual("2")).toBe(true);
		expect(new Decimal("2").lessThanOrEqual(2)).toBe(true);
		expect(new Decimal("2").lessThanOrEqual(2n)).toBe(true);
		expect(new Decimal("2").lessThanOrEqual(new Decimal("2"))).toBe(true);
		expect(new Decimal("2").lessThanOrEqual([2n, 0])).toBe(true);
	});

	it("throws on invalid input", () => {
		expect(() => new Decimal("1").lessThanOrEqual("x")).toThrow(TypeError);
		expect(() =>
			new Decimal("1").lessThanOrEqual({} as unknown as never),
		).toThrow(TypeError);
	});
});

describe("lte (alias)", () => {
	it("behaves like lessThanOrEqual", () => {
		expect(new Decimal("2.5").lte(3)).toBe(true);
		expect(new Decimal("2.5").lte(2)).toBe(false);
		expect(new Decimal("1.10").lte("1.1")).toBe(true);
		expect(new Decimal("-3").lte("-1.5")).toBe(true);
	});

	it("registers the alias as the same function on the prototype", () => {
		expect(Decimal.prototype.lessThanOrEqual).toBe(Decimal.prototype.lte);
	});
});
