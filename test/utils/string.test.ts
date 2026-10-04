import { describe, expect, it } from "vitest";
import { exponentialString } from "../../src/utils/string.ts";

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
