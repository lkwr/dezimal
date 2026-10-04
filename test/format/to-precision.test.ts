import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/format/to-precision.ts";

describe("toPrecision", () => {
	it("returns the exact display form without sd", () => {
		expect(new Decimal("255.5").toPrecision()).toBe("255.5");
		// The display form is toString's choice, not a plain expansion.
		expect(new Decimal("1.5e-7").toPrecision()).toBe("1.5e-7");
		expect(new Decimal(0).toPrecision()).toBe("0");
	});

	it("pads to sd significant digits in plain notation", () => {
		expect(new Decimal("255.5").toPrecision(5)).toBe("255.50");
		expect(new Decimal(1).toPrecision(3)).toBe("1.00");
		expect(new Decimal("987.654").toPrecision(7)).toBe("987.6540");
		// A leading power far above sd stays plain when sd asks for it:
		// the padded fraction is zeros, placed past the full integer part.
		expect(new Decimal("1.5e20").toPrecision(25)).toBe(
			"150000000000000000000.0000",
		);
	});

	it("rounds to sd significant digits in plain notation", () => {
		expect(new Decimal("987.654").toPrecision(3)).toBe("988");
		expect(new Decimal("987.654").toPrecision(5)).toBe("987.65");
	});

	it("carries after rounding into plain and exponential notation", () => {
		// 9.9996 rounds up to 1e1; padded to 3 digits -> 10.0 (plain).
		expect(new Decimal("9.9996").toPrecision(3)).toBe("10.0");
		// 999.96 rounds up to 1e3 -> exponential, padded to 3 digits.
		expect(new Decimal("999.96").toPrecision(3)).toBe("1.00e+3");
		expect(new Decimal("987.654").toPrecision(1)).toBe("1e+3");
	});

	it("formats leading powers above sd exponentially", () => {
		expect(new Decimal("255.5").toPrecision(2)).toBe("2.6e+2");
		expect(new Decimal("1.5e20").toPrecision(3)).toBe("1.50e+20");
	});

	it("stays plain at the minimum-plain-exponent edge", () => {
		// Leading power -6 is within the plain band (minPlainExponent = -7).
		expect(new Decimal("1.23e-6").toPrecision(3)).toBe("0.00000123");
		// Leading power -7 falls outside it, like toString's cutoff.
		expect(new Decimal("1.23e-7").toPrecision(3)).toBe("1.23e-7");
	});

	it("formats zero like a padded fraction", () => {
		expect(new Decimal(0).toPrecision(3)).toBe("0.00");
		expect(new Decimal(0).toPrecision(1)).toBe("0");
	});

	it("handles negative values", () => {
		expect(new Decimal("-987.654").toPrecision(3)).toBe("-988");
		expect(new Decimal("-987.654").toPrecision(1)).toBe("-1e+3");
	});

	it("rounds sd = 1 ties on 950 per mode", () => {
		// 950 is exactly halfway between 9e+2 and 1e+3.
		expect(new Decimal("950").toPrecision(1, "half-up")).toBe("1e+3");
		expect(new Decimal("950").toPrecision(1, "half-down")).toBe("9e+2");
		// half-even ties up because the quotient 9 is odd.
		expect(new Decimal("950").toPrecision(1, "half-even")).toBe("1e+3");
		expect(new Decimal("950").toPrecision(1, "up")).toBe("1e+3");
		expect(new Decimal("950").toPrecision(1, "down")).toBe("9e+2");
		expect(new Decimal("950").toPrecision(1, "ceil")).toBe("1e+3");
		expect(new Decimal("950").toPrecision(1, "floor")).toBe("9e+2");
		expect(new Decimal("950").toPrecision(1, "half-ceil")).toBe("1e+3");
		expect(new Decimal("950").toPrecision(1, "half-floor")).toBe("9e+2");
	});

	it("honors a per-call rounding mode override", () => {
		expect(new Decimal("987.654").toPrecision(2)).toBe("9.9e+2");
		expect(new Decimal("987.654").toPrecision(2, "down")).toBe("9.8e+2");
		expect(new Decimal("1.25").toPrecision(2, "half-even")).toBe("1.2");
	});

	it("accepts all DecimalLike receiver forms", () => {
		const expected = "9.5e+2";
		expect(new Decimal("950").toPrecision(2)).toBe(expected);
		expect(new Decimal(950).toPrecision(2)).toBe(expected);
		expect(new Decimal(950n).toPrecision(2)).toBe(expected);
		expect(new Decimal([95n, 1]).toPrecision(2)).toBe(expected);
		expect(new Decimal(new Decimal("950")).toPrecision(2)).toBe(expected);
	});

	it("throws RangeError for invalid sd", () => {
		const message = (sd: string) =>
			new RangeError(
				`Invalid significant digits: expected a positive integer, got ${sd}`,
			);
		expect(() => new Decimal(1).toPrecision(0)).toThrow(message("0"));
		expect(() => new Decimal(1).toPrecision(-1)).toThrow(message("-1"));
		expect(() => new Decimal(1).toPrecision(1.5)).toThrow(message("1.5"));
		expect(() => new Decimal(1).toPrecision(Number.NaN)).toThrow(
			message("NaN"),
		);
	});
});
