import { describe, expect, it } from "vitest";
import { exponentialString, plainString } from "../../src/utils/string.ts";

describe("exponentialString", () => {
	it("formats a single digit without a fraction", () => {
		expect(exponentialString("", "5", 3)).toBe("5e+3");
	});

	it("formats multiple significant digits as a fraction", () => {
		expect(exponentialString("", "142", 3)).toBe("1.42e+3");
	});

	it("formats the leading power zero as e+0", () => {
		expect(exponentialString("", "42", 0)).toBe("4.2e+0");
	});

	it("formats non-negative small powers as e+0", () => {
		expect(exponentialString("", "7", 0)).toBe("7e+0");
	});

	it("omits the plus sign for negative leading powers", () => {
		expect(exponentialString("", "5", -3)).toBe("5e-3");
		expect(exponentialString("", "142", -1)).toBe("1.42e-1");
	});

	it("prepends the sign", () => {
		expect(exponentialString("-", "5", -3)).toBe("-5e-3");
	});

	it("pads digits with zeros to totalDigits", () => {
		expect(exponentialString("", "1", 10, 3)).toBe("1.00e+10");
	});

	it("keeps extra digits instead of truncating them", () => {
		// padEnd never shortens, so more significant digits than requested
		// are kept as-is.
		expect(exponentialString("-", "123", -2, 2)).toBe("-1.23e-2");
	});

	it("matches the format used by Decimal.toString", () => {
		// 123.4 has digits "1234" at leading power 2.
		expect(exponentialString("", "1234", 2)).toBe("1.234e+2");
	});
});

describe("plainString", () => {
	it("appends zeros for non-negative exponents", () => {
		expect(plainString("", "12", 0)).toBe("12");
		expect(plainString("-", "12", 3)).toBe("-12000");
		expect(plainString("", "12", 1, 2)).toBe("120.00");
	});

	it("places the point inside or before the digits", () => {
		expect(plainString("", "1234", -2)).toBe("12.34");
		expect(plainString("", "1234", -4)).toBe("0.1234");
		expect(plainString("-", "12", -5)).toBe("-0.00012");
	});

	it("pads the fraction to at least fractionDigits", () => {
		expect(plainString("", "15", -1, 3)).toBe("1.500");
		expect(plainString("", "12345", -4, 2)).toBe("1.2345");
	});
});
