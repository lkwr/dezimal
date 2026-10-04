import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/significant-digits.ts";

describe("significantDigits", () => {
	it("counts the digits of the normalized coefficient", () => {
		expect(new Decimal("123.45").significantDigits()).toBe(5);
		expect(new Decimal("0.00123").significantDigits()).toBe(3);
		expect(new Decimal("-1234.5").significantDigits()).toBe(5);
		expect(new Decimal(123.4).significantDigits()).toBe(4);
		expect(new Decimal(420n).significantDigits()).toBe(2);
	});

	it("counts zero as one significant digit", () => {
		expect(new Decimal(0).significantDigits()).toBe(1);
		expect(new Decimal("0.000").significantDigits()).toBe(1);
		// dezi has no signed zero: "-0" parses to [0n, 0]
		expect(new Decimal("-0").significantDigits()).toBe(1);
	});

	it("never counts trailing zeros of the stored value", () => {
		// 100 normalizes to [1n, 2]
		expect(new Decimal(100).significantDigits()).toBe(1);
		// "1.20" normalizes to [12n, -1]
		expect(new Decimal("1.20").significantDigits()).toBe(2);
		// "1.2300" normalizes to [123n, -2]
		expect(new Decimal("1.2300").significantDigits()).toBe(3);
		// "1e20" normalizes to [1n, 20]
		expect(new Decimal("1e20").significantDigits()).toBe(1);
		// "1e-20" normalizes to [1n, -20]
		expect(new Decimal("1e-20").significantDigits()).toBe(1);
	});

	it("accepts raw tuples, counting digits after normalization", () => {
		// [1000n, 0] normalizes to [1n, 2]
		expect(new Decimal([1000n, 0]).significantDigits()).toBe(1);
		// [-700n, 2] normalizes to [-7n, 4]
		expect(new Decimal([-700n, 2]).significantDigits()).toBe(1);
		// [0n, 5] normalizes to [0n, 0]
		expect(new Decimal([0n, 5]).significantDigits()).toBe(1);
	});

	it("counts every digit of huge values", () => {
		expect(
			new Decimal("123456789012345678901234567891").significantDigits(),
		).toBe(30);
		// "-918273645000000000000" normalizes to [-918273645n, 12]
		expect(new Decimal("-918273645000000000000").significantDigits()).toBe(9);
	});

	it("counts digits of a Decimal receiver", () => {
		// "12.340" normalizes to [1234n, -2]
		expect(new Decimal(new Decimal("12.340")).significantDigits()).toBe(4);
	});

	it("exposes sd as an alias", () => {
		const values = [
			new Decimal(0),
			new Decimal("123.45"),
			new Decimal("-0.05"),
			new Decimal("1.2300"),
			new Decimal("1e20"),
			new Decimal([1000n, 0]),
		];
		for (const value of values) {
			expect(value.sd()).toBe(value.significantDigits());
		}
		expect(new Decimal("0.00123").sd()).toBe(3);
		expect(new Decimal(100).sd()).toBe(1);
		expect(new Decimal("-1234.5").sd()).toBe(5);
	});
});
