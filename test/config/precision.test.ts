import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/config/precision.ts";

describe("precision (static)", () => {
	it("defaults to 20 significant digits on import", () => {
		expect(Decimal.precision).toBe(20);
	});

	it("is assignable and restoreable", () => {
		const original = Decimal.precision;
		try {
			Decimal.precision = 42;
			expect(Decimal.precision).toBe(42);
		} finally {
			Decimal.precision = original;
		}
		expect(Decimal.precision).toBe(20);
	});
});
