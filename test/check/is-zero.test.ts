import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/check/is-zero.ts";

describe("isZero", () => {
	it("returns true for zero in every DecimalLike form", () => {
		const forms: DecimalLike[] = [
			"0",
			"0.0",
			"0.00",
			0,
			0n,
			[0n, 5] satisfies RawDecimal,
		];
		for (const form of forms) {
			expect(new Decimal(form).isZero()).toBe(true);
		}
	});

	it("returns false for non-zero values", () => {
		expect(new Decimal("0.1").isZero()).toBe(false);
		expect(new Decimal(1).isZero()).toBe(false);
		expect(new Decimal(123n).isZero()).toBe(false);
	});

	it("returns false for negative non-zero values", () => {
		expect(new Decimal("-0.1").isZero()).toBe(false);
		expect(new Decimal(-1).isZero()).toBe(false);
		expect(new Decimal(-123n).isZero()).toBe(false);
	});
});
