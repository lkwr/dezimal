import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/sign.ts";

describe("sign (static)", () => {
	it("returns the sign of a value", () => {
		expect(Decimal.sign(1)).toBe(1);
		expect(Decimal.sign(-1.5)).toBe(-1);
		expect(Decimal.sign("0")).toBe(0);
		expect(Decimal.sign(0n)).toBe(0);
		expect(Decimal.sign([0n, 5])).toBe(0);
	});

	it("throws on invalid input", () => {
		expect(() => Decimal.sign("x")).toThrow(TypeError);
		expect(() => Decimal.sign({} as unknown as never)).toThrow(TypeError);
	});
});
