import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/decimal-places.ts";

describe("decimalPlaces", () => {
	it("returns the number of digits after the decimal point", () => {
		// "123.456" normalizes to [123456n, -3]
		expect(new Decimal("123.456").decimalPlaces()).toBe(3);
		// "1.5e-3" normalizes to [15n, -4]
		expect(new Decimal("1.5e-3").decimalPlaces()).toBe(4);
		expect(new Decimal("0.00123").decimalPlaces()).toBe(5);
		expect(new Decimal("-0.5").decimalPlaces()).toBe(1);
	});

	it("normalizes away insignificant trailing zeros", () => {
		// "1.2300" normalizes to [123n, -2]
		expect(new Decimal("1.2300").decimalPlaces()).toBe(2);
	});

	it("returns 0 for integers and zero", () => {
		// 100 normalizes to [1n, 2]
		expect(new Decimal(100).decimalPlaces()).toBe(0);
		expect(new Decimal("1e999999").decimalPlaces()).toBe(0);
		expect(new Decimal(0).decimalPlaces()).toBe(0);
	});

	it("accepts number, bigint, Decimal and raw tuple receivers", () => {
		expect(new Decimal(0.5).decimalPlaces()).toBe(1);
		expect(new Decimal(123n).decimalPlaces()).toBe(0);
		expect(new Decimal(new Decimal("12.34")).decimalPlaces()).toBe(2);
		// [123n, -5]
		expect(new Decimal([123n, -5]).decimalPlaces()).toBe(5);
	});

	it("counts large negative exponents", () => {
		// "1e-999999" normalizes to [1n, -999999]
		expect(new Decimal("1e-999999").decimalPlaces()).toBe(999999);
	});

	it("exposes dp as an alias", () => {
		expect(new Decimal("123.456").dp()).toBe(3);
		expect(new Decimal("-0.5").dp()).toBe(1);
		expect(new Decimal(0).dp()).toBe(0);
		expect(new Decimal("1e-999999").dp()).toBe(999999);
	});
});
