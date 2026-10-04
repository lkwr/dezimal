import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/equals.ts";

describe("equals (instance)", () => {
	it("returns true for equal values with different representations", () => {
		expect(new Decimal("1.10").equals("1.1")).toBe(true);
		expect(new Decimal("1.1").equals("1.10")).toBe(true);
		expect(new Decimal("1e20").equals(100_000_000_000_000_000_000n)).toBe(true);
		expect(new Decimal("0").equals("0.0")).toBe(true);
		expect(new Decimal("-1.50").equals(-1.5)).toBe(true);
	});

	it("returns false for unequal values", () => {
		expect(new Decimal("1.5").equals(2)).toBe(false);
		expect(new Decimal("1.5").equals("1.6")).toBe(false);
		expect(new Decimal("-1.5").equals(1.5)).toBe(false);
		expect(new Decimal("9.99").equals("10")).toBe(false);
	});

	it("accepts every DecimalLike form", () => {
		expect(new Decimal("2").equals("2")).toBe(true);
		expect(new Decimal("2").equals(2)).toBe(true);
		expect(new Decimal("2").equals(2n)).toBe(true);
		expect(new Decimal("2").equals(new Decimal("2.0"))).toBe(true);
		expect(new Decimal("2").equals([20n, -1])).toBe(true);

		expect(new Decimal("2").equals(1n)).toBe(false);
		expect(new Decimal("2").equals([1n, 1])).toBe(false);
	});

	it("throws on invalid input", () => {
		expect(() => new Decimal("1").equals("x")).toThrow(TypeError);
		expect(() => new Decimal("1").equals({} as unknown as never)).toThrow(
			TypeError,
		);
	});
});

describe("eq (alias)", () => {
	it("behaves like equals", () => {
		expect(new Decimal("1.10").eq("1.1")).toBe(true);
		expect(new Decimal("1.5").eq("1.6")).toBe(false);
	});

	it("shares the implementation with equals", () => {
		expect(new Decimal("1").eq).toBeTypeOf("function");
		expect(Decimal.prototype.eq).toBe(Decimal.prototype.equals);
	});
});
