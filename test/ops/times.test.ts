import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/times.ts";

/** Runs `times` and returns the normalized raw [coefficient, exponent] tuple. */
const times = (self: DecimalLike, other: DecimalLike): RawDecimal =>
	new Decimal(self).times(other).raw;

describe("times", () => {
	it("multiplies integers and decimals exactly", () => {
		expect(times(12n, 12n)).toEqual([144n, 0]);
		// 1.5 × 2.5 = 3.75
		expect(times("1.5", "2.5")).toEqual([375n, -2]);
		expect(times("0.1", "0.1")).toEqual([1n, -2]);
	});

	it("applies the sign rule", () => {
		expect(times(-2, 3)).toEqual([-6n, 0]);
		expect(times(-2, -3)).toEqual([6n, 0]);
	});

	it("collapses zero products", () => {
		expect(times(0, "-1.5")).toEqual([0n, 0]);
	});

	it("normalizes trailing zeros", () => {
		// 2.5 × 4 = 10.0
		expect(times("2.5", 4)).toEqual([1n, 1]);
	});

	it("is exact beyond any precision", () => {
		const big = 10n ** 40n + 1n;
		expect(times(big, big)).toEqual([big * big, 0]);
	});

	it("exposes the mul and multiply aliases", () => {
		expect(new Decimal(3).mul(4).raw).toEqual([12n, 0]);
		expect(new Decimal(3).multiply(4).raw).toEqual([12n, 0]);
	});

	it("throws when the product leaves the exponent limit", () => {
		expect(() => times("1e999999", 10)).toThrow("exponent out of range");
		expect(() => times("1e-999999", "0.1")).toThrow(RangeError);
		expect(times("1e999998", 10)).toEqual([1n, 999999]);
	});
});
