import { describe, expect, it } from "vitest";
import { abs, normalize, pow10, TEN } from "../../src/utils/common.ts";

describe("TEN", () => {
	it("is the bigint 10", () => {
		expect(TEN).toBe(10n);
	});
});

describe("pow10", () => {
	it("returns one for exponent zero", () => {
		expect(pow10(0)).toBe(1n);
	});

	it("returns powers of ten for non-negative exponents", () => {
		expect(pow10(1)).toBe(10n);
		expect(pow10(20)).toBe(10n ** 20n);
	});

	it("throws for negative exponents", () => {
		expect(() => pow10(-1)).toThrow(RangeError);
	});
});

describe("abs", () => {
	it("keeps non-negative values unchanged", () => {
		expect(abs(5n)).toBe(5n);
	});

	it("negates negative values", () => {
		expect(abs(-5n)).toBe(5n);
	});

	it("keeps zero as zero", () => {
		expect(abs(0n)).toBe(0n);
	});
});

describe("normalize", () => {
	it("leaves already normalized values unchanged", () => {
		expect(normalize([123n, -2])).toEqual([123n, -2]);
	});

	it("strips trailing zeros and adjusts the exponent", () => {
		// 1.20 -> 1.2
		expect(normalize([120n, -2])).toEqual([12n, -1]);
	});

	it("strips all trailing zeros", () => {
		// 100 -> 1e2
		expect(normalize([100n, 0])).toEqual([1n, 2]);
	});

	it("normalizes negative coefficients", () => {
		// -1.20 -> -1.2
		expect(normalize([-120n, -2])).toEqual([-12n, -1]);
	});

	it("reduces zero to [0n, 0]", () => {
		expect(normalize([0n, -5])).toEqual([0n, 0]);
	});
});
