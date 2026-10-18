import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/format/to-big-int.ts";

describe("toBigInt", () => {
	it("converts integers exactly", () => {
		expect(new Decimal(0).toBigInt()).toBe(0n);
		expect(new Decimal("-42").toBigInt()).toBe(-42n);
		expect(new Decimal("1.5e3").toBigInt()).toBe(1500n);
		expect(new Decimal("9007199254740993").toBigInt()).toBe(9007199254740993n);
		expect(new Decimal("1e40").toBigInt()).toBe(10n ** 40n);
	});

	it("rejects fractional values", () => {
		expect(() => new Decimal("1.5").toBigInt()).toThrow(RangeError);
		expect(() => new Decimal("-0.001").toBigInt()).toThrow(RangeError);
	});
});
