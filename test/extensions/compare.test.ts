import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/extensions/compare.ts";

describe("compare (instance)", () => {
	it("compares basic values", () => {
		expect(new Decimal("1.5").compare(2)).toBe(-1);
		expect(new Decimal("1.5").compare("1.5")).toBe(0);
		expect(new Decimal("1.5").compare(1n)).toBe(1);
	});

	it("compares equal values with different representations", () => {
		expect(new Decimal("1.10").compare("1.1")).toBe(0);
		expect(new Decimal("1e20").compare(100_000_000_000_000_000_000n)).toBe(0);
	});

	it("compares values of different magnitude order", () => {
		expect(new Decimal("9.99").compare("10")).toBe(-1);
		expect(new Decimal("10").compare("9.99")).toBe(1);
		expect(new Decimal("1e20").compare("12345678901234567890.12")).toBe(1);
	});

	it("handles negative and zero operands", () => {
		expect(new Decimal("-1.5").compare(-3)).toBe(1);
		expect(new Decimal("-1.5").compare(0)).toBe(-1);
		expect(new Decimal("-0.5").compare("0")).toBe(-1);
	});
});

describe("compare (static)", () => {
	it("returns the same ordering as the instance method", () => {
		expect(Decimal.compare("1.5", 2)).toBe(-1);
		expect(Decimal.compare(2, "1.5")).toBe(1);
		expect(Decimal.compare("1.10", "1.1")).toBe(0);
		expect(Decimal.compare(-1.5, -3)).toBe(1);
		expect(Decimal.compare("0", "0.0")).toBe(0);
	});

	it("registers both sides on the same extension module", () => {
		expect(Decimal.compare).toBeTypeOf("function");
		expect(Decimal.prototype.compare).toBeTypeOf("function");
	});

	it("throws on invalid input", () => {
		expect(() => Decimal.compare("x", 1)).toThrow(TypeError);
		expect(() => Decimal.compare(1, {} as unknown as never)).toThrow(TypeError);
	});
});
