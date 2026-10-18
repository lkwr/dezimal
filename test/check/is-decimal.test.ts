import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/check/is-decimal.ts";

describe("isDecimal", () => {
	it("recognizes Decimal instances", () => {
		expect(Decimal.isDecimal(new Decimal(1))).toBe(true);
	});

	it("rejects everything else", () => {
		for (const value of ["1", 1, 1n, [1n, 0], null, undefined, {}]) {
			expect(Decimal.isDecimal(value)).toBe(false);
		}
	});

	it("narrows the type", () => {
		const value: unknown = new Decimal(2);
		if (Decimal.isDecimal(value)) {
			expect(value.coefficient).toBe(2n);
		}
	});
});
