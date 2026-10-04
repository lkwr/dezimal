import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/ceil.ts";

/** Runs `ceil` and returns the normalized raw [coefficient, exponent] tuple. */
const ceil = (value: DecimalLike): RawDecimal => new Decimal(value).ceil().raw;

describe("ceil", () => {
	it("rounds positive fractions up", () => {
		expect(ceil("12.34")).toEqual([13n, 0]);
		expect(ceil(0.25)).toEqual([1n, 0]);
		expect(ceil("0.0001")).toEqual([1n, 0]);
	});

	it("rounds negative fractions towards zero", () => {
		expect(ceil("-12.34")).toEqual([-12n, 0]);
		// ceil(-0.0001) = 0, the smallest integer >= -0.0001
		expect(ceil("-0.0001")).toEqual([0n, 0]);
	});

	it("leaves exact integers unchanged", () => {
		expect(ceil(12n)).toEqual([12n, 0]);
		expect(ceil(-12n)).toEqual([-12n, 0]);
		// trailing zeros are normalized: "12.00" is exactly 12
		expect(ceil("12.00")).toEqual([12n, 0]);
	});

	it("returns [0n, 0] for zero", () => {
		expect(ceil(0)).toEqual([0n, 0]);
		expect(ceil("-0.00")).toEqual([0n, 0]);
	});
});
