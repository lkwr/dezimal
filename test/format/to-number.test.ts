import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/format/to-number.ts";

describe("toNumber", () => {
	it("returns exact small values", () => {
		expect(new Decimal(1.5).toNumber()).toBe(1.5);
		expect(new Decimal("0.1").toNumber()).toBe(0.1);
	});

	it("loses precision for values beyond 64-bit float precision", () => {
		expect(new Decimal("1234567890123456789012").toNumber()).toBe(
			Number("1234567890123456789012"),
		);
	});

	it("converts huge values to Infinity", () => {
		expect(new Decimal("1e999999").toNumber()).toBe(Infinity);
	});

	it("converts tiny values to 0", () => {
		expect(new Decimal("1e-999999").toNumber()).toBe(0);
	});

	it("converts negative values", () => {
		expect(new Decimal("-2.5").toNumber()).toBe(-2.5);
		expect(new Decimal("-1e999999").toNumber()).toBe(-Infinity);
	});

	it("handles exponent form", () => {
		expect(new Decimal("1e20").toNumber()).toBe(1e20);
	});
});
