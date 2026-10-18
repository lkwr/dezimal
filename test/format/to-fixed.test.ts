import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/format/to-fixed.ts";

describe("toFixed", () => {
	it("returns the full exact expansion without dp", () => {
		expect(new Decimal("0.5").toFixed()).toBe("0.5");
		expect(new Decimal("1e-7").toFixed()).toBe("0.0000001");
	});

	it("pads the fraction with zeros", () => {
		expect(new Decimal(1).toFixed(2)).toBe("1.00");
		expect(new Decimal("1.5").toFixed(2)).toBe("1.50");
	});

	it("rounds at dp with the default half-up mode", () => {
		// 1.005 sits exactly on the halfway point between 1.00 and 1.01
		expect(new Decimal("1.005").toFixed(2)).toBe("1.01");
		expect(new Decimal("1.25").toFixed(1)).toBe("1.3");
	});

	it("honors a per-call rounding mode override", () => {
		expect(new Decimal("1.005").toFixed(2, "half-down")).toBe("1.00");
		expect(new Decimal("1.25").toFixed(1, "half-even")).toBe("1.2");
	});

	it("handles negative values", () => {
		expect(new Decimal("-1.5").toFixed(2)).toBe("-1.50");
	});

	it("rounds negatives onto zero without a sign", () => {
		// -0.0001 rounds down to zero at 2 dp; dezimal has no signed zero, so
		// the result is "0.00", not "-0.00".
		expect(new Decimal("-0.0001").toFixed(2)).toBe("0.00");
	});

	it("expands integers and exponent notation", () => {
		expect(new Decimal(5).toFixed(2)).toBe("5.00");
		expect(new Decimal(5).toFixed(0)).toBe("5");
		expect(new Decimal("1e20").toFixed(2)).toBe("100000000000000000000.00");
	});

	it("keeps huge dp cheap for on-grid values", () => {
		// The exponent 9 is on the grid of 10^-dp for every dp, so
		// roundToScale takes its early return instead of materializing
		// pow10(dp - 9). dp stays at 1e6 because the padded output is
		// dp-sized and Node's maximum string length rejects dp around 1e9.
		const result = new Decimal("1e9").toFixed(1_000_000);
		expect(result).toBe(`1000000000.${"0".repeat(1_000_000)}`);
	});

	it("throws RangeError for invalid dp", () => {
		expect(() => new Decimal(1).toFixed(-1)).toThrow(RangeError);
		expect(() => new Decimal(1).toFixed(1.5)).toThrow(RangeError);
		expect(() => new Decimal(1).toFixed(Number.NaN)).toThrow(RangeError);
	});
});
