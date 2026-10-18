import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/format/to-string.ts";

describe("notation thresholds (statics)", () => {
	it("declares the plain/exponential boundaries on import", () => {
		expect(Decimal.maxPlainExponent).toBe(20);
		expect(Decimal.minPlainExponent).toBe(-7);
	});

	it("formats the plain range without an exponent", () => {
		expect(new Decimal("123.4").toString()).toBe("123.4");
		expect(new Decimal("1e20").toString()).toBe("100000000000000000000");
	});

	it("formats exponents beyond the boundaries exponentially", () => {
		expect(new Decimal("1e21").toString()).toBe("1e+21");
		expect(new Decimal("1e-7").toString()).toBe("1e-7");
	});

	it("boundary exponents stay plain or switch exactly at the limits", () => {
		// leading power 20 is within the plain range (maxPlainExponent = 20)
		expect(new Decimal("1.5e20").toString()).toBe("150000000000000000000");
		// leading power 21 exceeds it
		expect(new Decimal("1.5e21").toString()).toBe("1.5e+21");
		// leading power -7 is exponential (minPlainExponent = -7, inclusive)
		expect(new Decimal("1.5e-7").toString()).toBe("1.5e-7");
		// leading power -6 is plain
		expect(new Decimal("1.5e-6").toString()).toBe("0.0000015");
	});

	it("uses the configured thresholds when they differ", () => {
		const originalMax = Decimal.maxPlainExponent;
		const originalMin = Decimal.minPlainExponent;
		Decimal.maxPlainExponent = 3;
		Decimal.minPlainExponent = -2;
		try {
			expect(new Decimal("1234").toString()).toBe("1234");
			expect(new Decimal("12345").toString()).toBe("1.2345e+4");
			expect(new Decimal("0.001").toString()).toBe("1e-3");
		} finally {
			Decimal.maxPlainExponent = originalMax;
			Decimal.minPlainExponent = originalMin;
		}
	});

	it("formats zero and negatives", () => {
		expect(new Decimal(0).toString()).toBe("0");
		expect(new Decimal("-123.4").toString()).toBe("-123.4");
		expect(new Decimal("-1e21").toString()).toBe("-1e+21");
	});
});

describe("string coercion", () => {
	it("uses toString in string contexts", () => {
		const value = new Decimal("-1.25");
		expect(`${value}`).toBe("-1.25");
		expect(String(value)).toBe("-1.25");
	});
});
