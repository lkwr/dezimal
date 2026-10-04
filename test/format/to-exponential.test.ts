import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/format/to-exponential.ts";

describe("toExponential", () => {
	it("emits all significant digits without dp", () => {
		expect(new Decimal(1234).toExponential()).toBe("1.234e+3");
		expect(new Decimal("0.001234").toExponential()).toBe("1.234e-3");
		expect(new Decimal("1e999999").toExponential()).toBe("1e+999999");
		expect(new Decimal("1e-999999").toExponential()).toBe("1e-999999");
	});

	it("pads the fraction with zeros to exactly dp digits", () => {
		expect(new Decimal("1.5").toExponential(4)).toBe("1.5000e+0");
		expect(new Decimal("-2.5").toExponential(2)).toBe("-2.50e+0");
	});

	it("rounds at dp with the default half-up mode", () => {
		expect(new Decimal("9876543").toExponential(2)).toBe("9.88e+6");
		// 1.05 sits exactly on the halfway point between 1.0 and 1.1
		expect(new Decimal("1.05").toExponential(1)).toBe("1.1e+0");
	});

	it("honors a per-call rounding mode override", () => {
		expect(new Decimal("1.05").toExponential(1, "half-down")).toBe("1.0e+0");
		// 2.5 is a tie at one significant digit: half-up rounds away from zero.
		expect(new Decimal("2.5").toExponential(0)).toBe("3e+0");
		expect(new Decimal("2.5").toExponential(0, "half-even")).toBe("2e+0");
	});

	it("recomputes the leading power when rounding carries", () => {
		// 9.99 rounds up to 10, so the exponent moves from 0 to 1 and the
		// fraction is padded back to one digit.
		expect(new Decimal("9.99").toExponential(1)).toBe("1.0e+1");
	});

	it("formats zero with and without dp", () => {
		expect(new Decimal("0").toExponential()).toBe("0e+0");
		expect(new Decimal("0").toExponential(3)).toBe("0.000e+0");
	});

	it("accepts any DecimalLike receiver", () => {
		expect(new Decimal("1234").toExponential(2)).toBe("1.23e+3");
		expect(new Decimal(1234n).toExponential(1)).toBe("1.2e+3");
		expect(new Decimal([1234n, 0]).toExponential(3)).toBe("1.234e+3");
	});

	it("keeps huge dp cheap for on-grid values", () => {
		// The exponent stays above the dp+1-significant-digit grid for every
		// dp, so roundToScale takes its early return instead of materializing
		// pow10. dp stays at 1e6 because the padded output is dp-sized and
		// Node's maximum string length rejects dp around 1e9.
		const result = new Decimal("1e9").toExponential(1_000_000);
		expect(result).toBe(`1.${"0".repeat(1_000_000)}e+9`);
	});

	it("throws RangeError for invalid dp", () => {
		expect(() => new Decimal(1).toExponential(-1)).toThrow(RangeError);
		expect(() => new Decimal(1).toExponential(1.5)).toThrow(
			"Invalid decimal places: expected a non-negative integer, got 1.5",
		);
		expect(() => new Decimal(1).toExponential(Number.NaN)).toThrow(RangeError);
	});
});
