import { describe, expect, it } from "vitest";
import { Decimal } from "../../src/decimal.ts";
import "../../src/ops/hypot.ts";
import "../../src/format/to-string.ts";

describe("hypot", () => {
	it("returns exact roots of the sum of squares", () => {
		expect(Decimal.hypot(3, 4).raw).toEqual([5n, 0]);
		expect(Decimal.hypot(3, 4, 12).raw).toEqual([13n, 0]);
		expect(Decimal.hypot(5).raw).toEqual([5n, 0]);
		expect(Decimal.hypot(7n).raw).toEqual([7n, 0]);
		expect(Decimal.hypot(8).raw).toEqual([8n, 0]);
	});

	it("cancels the sign of each value", () => {
		expect(Decimal.hypot(-3, 4).raw).toEqual([5n, 0]);
		expect(Decimal.hypot(-3, -4).raw).toEqual([5n, 0]);
		expect(Decimal.hypot("-5").raw).toEqual([5n, 0]);
	});

	it("returns zero for no values and all-zero values", () => {
		expect(Decimal.hypot().raw).toEqual([0n, 0]);
		expect(Decimal.hypot(0, 0).raw).toEqual([0n, 0]);
		expect(Decimal.hypot("0", [0n, 5]).raw).toEqual([0n, 0]);
	});

	it("rounds irrational sums like sqrt", () => {
		expect(Decimal.hypot(1, 1).raw).toEqual([14142135623730950488n, -19]);
		expect(Decimal.hypot(1, 1).toString()).toBe("1.4142135623730950488");
	});

	it("honors `Decimal.precision`", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 5;
			expect(Decimal.hypot(1, 1).toString()).toBe("1.4142");
		} finally {
			Decimal.precision = precision;
		}
	});

	it("stays exact whatever the mode for exact sums", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "floor";
			expect(Decimal.hypot(3, 4).raw).toEqual([5n, 0]);
			Decimal.rounding = "up";
			expect(Decimal.hypot(5, 12).raw).toEqual([13n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("rescales huge squares through sqrt", () => {
		expect(Decimal.hypot("1e999999").raw).toEqual([1n, 999999]);
	});

	it("throws outside the exponent limit", () => {
		// 2.2360679774997896964e-1000018 normalizes to a field beyond ±999999.
		expect(() => Decimal.hypot("1e-999999", "2e-999999")).toThrow(RangeError);
		expect(() => Decimal.hypot("1e-999999", "2e-999999")).toThrow(
			"exponent out of range",
		);
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(3);
		expect(Decimal.hypot(self, 4).raw).toEqual([5n, 0]);
		expect(Decimal.hypot("3", 4).raw).toEqual([5n, 0]);
		expect(Decimal.hypot(3, 4).raw).toEqual([5n, 0]);
		expect(Decimal.hypot(3n, 4).raw).toEqual([5n, 0]);
		expect(Decimal.hypot([3n, 0], 4).raw).toEqual([5n, 0]);
	});

	it("propagates invalid input from parse", () => {
		expect(() => Decimal.hypot("x", 4)).toThrow(TypeError);
		expect(() => Decimal.hypot(3, {} as unknown as never)).toThrow(TypeError);
	});

	it("throws when precision is below 1", () => {
		const precision = Decimal.precision;
		try {
			Decimal.precision = 0;
			expect(() => Decimal.hypot(3, 4)).toThrow(RangeError);
			expect(() => Decimal.hypot(3, 4)).toThrow("expected a positive integer");
		} finally {
			Decimal.precision = precision;
		}
	});
});
