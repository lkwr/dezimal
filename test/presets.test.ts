import { describe, expect, it } from "vitest";
import { Decimal } from "../src/decimal.ts";
import "../src/preset/basic.ts";
import "../src/preset/bases.ts";
import "../src/preset/config.ts";
import "../src/preset/format.ts";
import "../src/preset/full.ts";
import "../src/preset/hyperbolic.ts";
import "../src/preset/power.ts";
import "../src/preset/predicate.ts";
import "../src/preset/rounding.ts";
import "../src/preset/trigonometric.ts";

describe("presets", () => {
	it("expose the arithmetic core", () => {
		expect(
			new Decimal(1).plus(2).minus(1).times(4).divide(2).abs().raw,
		).toEqual([4n, 0]);
	});

	it("expose comparison and formatting", () => {
		expect(new Decimal(2).compare(3)).toBe(-1);
		expect(new Decimal("0.0000001234").toString()).toBe("1.234e-7");
		expect(new Decimal("1.50").toPlainString()).toBe("1.5");
	});

	it("expose the config statics", () => {
		expect(Decimal.precision).toBe(20);
		expect(Decimal.rounding).toBe("half-up");
	});
});
