import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/greater-than.ts";

describe("greaterThan (instance)", () => {
	it("orders values with mixed representations", () => {
		expect(new Decimal("9.99").greaterThan(10)).toBe(false);
		expect(new Decimal(10).greaterThan("9.99")).toBe(true);
		expect(new Decimal("1e20").greaterThan("12345678901234567890.12")).toBe(
			true,
		);
		expect(new Decimal("0.1").greaterThan(0.09)).toBe(true);
	});

	it("returns false for equal values in both directions", () => {
		expect(new Decimal("1.10").greaterThan("1.1")).toBe(false);
		expect(new Decimal("1.1").greaterThan("1.10")).toBe(false);
		expect(new Decimal("1e20").greaterThan(100_000_000_000_000_000_000n)).toBe(
			false,
		);
	});

	it("handles negative and zero operands", () => {
		expect(new Decimal("-1.5").greaterThan(-3)).toBe(true);
		expect(new Decimal("-3").greaterThan("-1.5")).toBe(false);
		expect(new Decimal("-1.5").greaterThan(0)).toBe(false);
		expect(new Decimal("-0.5").greaterThan("0")).toBe(false);
	});

	it("accepts all DecimalLike forms", () => {
		const decimal = new Decimal("2.5");
		expect(decimal.greaterThan("2")).toBe(true);
		expect(decimal.greaterThan(2)).toBe(true);
		expect(decimal.greaterThan(2n)).toBe(true);
		expect(decimal.greaterThan(new Decimal(2))).toBe(true);
		expect(decimal.greaterThan([20n, -1])).toBe(true);
		expect(decimal.greaterThan([3n, 0])).toBe(false);
	});

	it("throws on invalid input", () => {
		expect(() => new Decimal(1).greaterThan("x")).toThrow(TypeError);
		expect(() => new Decimal(1).greaterThan({} as unknown as never)).toThrow(
			TypeError,
		);
	});
});

describe("gt (alias)", () => {
	it("behaves like greaterThan", () => {
		expect(new Decimal("3.5").gt("3")).toBe(true);
		expect(new Decimal("3").gt("3.5")).toBe(false);
	});

	it("binds the alias to the same implementation", () => {
		expect(Decimal.prototype.gt).toBe(Decimal.prototype.greaterThan);
	});
});
