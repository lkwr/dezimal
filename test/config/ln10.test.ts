import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/config/ln10.ts";
import "../../src/format/to-string.ts";

describe("ln10 (static)", () => {
	it("pins ln(10) as a Decimal value", () => {
		expect(Decimal.ln10).toBeInstanceOf(Decimal);
		expect(Decimal.ln10.toString()).toBe("2.302585092994045684017991454684");
	});

	it("is overridable like `Decimal.precision`", () => {
		const pinned = Decimal.ln10;
		try {
			Decimal.ln10 = new Decimal("2.3025850929940456840179914546843642");
			expect(Decimal.ln10.toString()).toBe(
				"2.3025850929940456840179914546843642",
			);
		} finally {
			Decimal.ln10 = pinned;
		}
	});
});
