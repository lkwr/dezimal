import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/format/to-plain-string.ts";

const plain = (value: string, fractionDigits?: number): string =>
	new Decimal(value).toPlainString(fractionDigits);

describe("toPlainString", () => {
	it("expands integers and fractions without exponent notation", () => {
		expect(plain("0")).toBe("0");
		expect(plain("123")).toBe("123");
		expect(plain("1e21")).toBe("1000000000000000000000");
		expect(plain("-1.5")).toBe("-1.5");
		expect(plain("1.23e-10")).toBe("0.000000000123");
		expect(plain("12.5e-1")).toBe("1.25");
	});

	it("pads the fraction to at least fractionDigits", () => {
		expect(plain("0", 2)).toBe("0.00");
		expect(plain("1", 3)).toBe("1.000");
		expect(plain("-1.5", 3)).toBe("-1.500");
		expect(plain("0.05", 1)).toBe("0.05");
	});

	it("never rounds or truncates", () => {
		expect(plain("1.2345", 2)).toBe("1.2345");
		expect(plain("1.5", 0)).toBe("1.5");
	});
});
