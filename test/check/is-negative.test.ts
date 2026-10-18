import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/check/is-negative.ts";

/** Runs `isNegative` on any DecimalLike input. */
const isNegative = (value: DecimalLike): boolean =>
	new Decimal(value).isNegative();

describe("isNegative", () => {
	it("returns true for negative values", () => {
		expect(isNegative("-1")).toBe(true);
		expect(isNegative("-1.5")).toBe(true);
		expect(isNegative("-1e-3")).toBe(true);
		expect(isNegative(-1)).toBe(true);
		expect(isNegative(-1.5)).toBe(true);
		expect(isNegative(-1n)).toBe(true);
		expect(isNegative([-1n, 0] satisfies RawDecimal)).toBe(true);
		expect(isNegative([-123n, -2] satisfies RawDecimal)).toBe(true);
	});

	it("returns false for zero", () => {
		expect(isNegative(0)).toBe(false);
		expect(isNegative(0n)).toBe(false);
		expect(isNegative("0")).toBe(false);
		expect(isNegative("0.0")).toBe(false);
		// dezimal has no -0: "-0" normalizes to [0n, 0]
		expect(isNegative("-0")).toBe(false);
		expect(isNegative([0n, 0] satisfies RawDecimal)).toBe(false);
	});

	it("returns false for positive values", () => {
		expect(isNegative("1")).toBe(false);
		expect(isNegative("1.5")).toBe(false);
		expect(isNegative("1e3")).toBe(false);
		expect(isNegative(1)).toBe(false);
		expect(isNegative(1.5)).toBe(false);
		expect(isNegative(1n)).toBe(false);
		expect(isNegative([123n, -2] satisfies RawDecimal)).toBe(false);
	});

	it("exposes isNeg as an alias", () => {
		expect(isNegative("-1")).toBe(new Decimal("-1").isNeg());
		expect(isNegative(0)).toBe(new Decimal(0).isNeg());
		expect(isNegative("1.5")).toBe(new Decimal("1.5").isNeg());
	});
});
