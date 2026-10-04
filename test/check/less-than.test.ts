import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/less-than.ts";

describe("lessThan (instance)", () => {
	it("orders values with mixed representations", () => {
		expect(new Decimal("1.5").lessThan(2)).toBe(true);
		expect(new Decimal("1.5").lessThan(1n)).toBe(false);
		expect(new Decimal("9.99").lessThan("10")).toBe(true);
		expect(new Decimal("1e20").lessThan("12345678901234567890.12")).toBe(false);
	});

	it("returns false for equal values with different representations", () => {
		expect(new Decimal("1.5").lessThan("1.5")).toBe(false);
		expect(new Decimal("1.10").lessThan("1.1")).toBe(false);
		expect(new Decimal("1e20").lessThan(100_000_000_000_000_000_000n)).toBe(
			false,
		);
		expect(new Decimal("0").lessThan("0.0")).toBe(false);
	});

	it("handles negative and zero operands", () => {
		expect(new Decimal("-1.5").lessThan(-3)).toBe(false);
		expect(new Decimal("-3").lessThan("-1.5")).toBe(true);
		expect(new Decimal("-1.5").lessThan(0)).toBe(true);
		expect(new Decimal("-0.5").lessThan("0")).toBe(true);
		expect(new Decimal("0").lessThan("-0.5")).toBe(false);
	});

	it("accepts every DecimalLike form", () => {
		const value = new Decimal("2.5");
		expect(value.lessThan("3")).toBe(true);
		expect(value.lessThan(3)).toBe(true);
		expect(value.lessThan(3n)).toBe(true);
		expect(value.lessThan(new Decimal(3))).toBe(true);
		expect(value.lessThan([30n, -1])).toBe(true);
		expect(value.lessThan([15n, -1])).toBe(false);
	});

	it("exposes the lt alias with the same behavior", () => {
		expect(new Decimal("1.5").lt(2)).toBe(true);
		expect(new Decimal("1.5").lt("1.5")).toBe(false);
		expect(new Decimal("1.5").lt(1n)).toBe(false);
	});

	it("throws on invalid input", () => {
		expect(() => new Decimal("1").lessThan("x")).toThrow(TypeError);
		expect(() => new Decimal("1").lessThan({} as unknown as never)).toThrow(
			TypeError,
		);
	});
});
