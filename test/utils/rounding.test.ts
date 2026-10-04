import { describe, expect, it } from "vitest";
import { roundToScale } from "../../src/utils/rounding.ts";

describe("roundToScale", () => {
	describe("zero", () => {
		it("returns [0n, 0] regardless of mode", () => {
			expect(roundToScale([0n, 0], 0, "half-up")).toEqual([0n, 0]);
			expect(roundToScale([0n, -5], 3, "floor")).toEqual([0n, 0]);
			expect(roundToScale([0n, 2], -2, "up")).toEqual([0n, 0]);
		});
	});

	describe("already on the grid", () => {
		it("returns the value unchanged", () => {
			expect(roundToScale([123n, 5], -2, "up")).toEqual([123n, 5]);
			expect(roundToScale([12n, 0], 0, "floor")).toEqual([12n, 0]);
			expect(roundToScale([-7n, 3], 1, "half-even")).toEqual([-7n, 3]);
		});

		it("handles giant target exponents cheaply", () => {
			expect(roundToScale([123n, 5], -1e9, "half-up")).toEqual([123n, 5]);
		});

		it("normalizes trailing zeros even on the grid", () => {
			// 1.20 -> 1.2
			expect(roundToScale([120n, -2], -2, "down")).toEqual([12n, -1]);
		});
	});

	describe("directed modes", () => {
		// 12.25, 12.5, 12.75 rounded to units
		it("breaks towards zero for positive values", () => {
			expect(roundToScale([1225n, -2], 0, "up")).toEqual([13n, 0]);
			expect(roundToScale([125n, -1], 0, "up")).toEqual([13n, 0]);
			expect(roundToScale([1275n, -2], 0, "up")).toEqual([13n, 0]);

			expect(roundToScale([1225n, -2], 0, "down")).toEqual([12n, 0]);
			expect(roundToScale([125n, -1], 0, "down")).toEqual([12n, 0]);
			expect(roundToScale([1275n, -2], 0, "down")).toEqual([12n, 0]);

			expect(roundToScale([1225n, -2], 0, "ceil")).toEqual([13n, 0]);
			expect(roundToScale([125n, -1], 0, "ceil")).toEqual([13n, 0]);
			expect(roundToScale([1275n, -2], 0, "ceil")).toEqual([13n, 0]);

			expect(roundToScale([1225n, -2], 0, "floor")).toEqual([12n, 0]);
			expect(roundToScale([125n, -1], 0, "floor")).toEqual([12n, 0]);
			expect(roundToScale([1275n, -2], 0, "floor")).toEqual([12n, 0]);
		});

		it("breaks away from zero for negative values", () => {
			expect(roundToScale([-1225n, -2], 0, "up")).toEqual([-13n, 0]);
			expect(roundToScale([-125n, -1], 0, "up")).toEqual([-13n, 0]);
			expect(roundToScale([-1275n, -2], 0, "up")).toEqual([-13n, 0]);

			expect(roundToScale([-1225n, -2], 0, "down")).toEqual([-12n, 0]);
			expect(roundToScale([-125n, -1], 0, "down")).toEqual([-12n, 0]);
			expect(roundToScale([-1275n, -2], 0, "down")).toEqual([-12n, 0]);

			expect(roundToScale([-1225n, -2], 0, "ceil")).toEqual([-12n, 0]);
			expect(roundToScale([-125n, -1], 0, "ceil")).toEqual([-12n, 0]);
			expect(roundToScale([-1275n, -2], 0, "ceil")).toEqual([-12n, 0]);

			expect(roundToScale([-1225n, -2], 0, "floor")).toEqual([-13n, 0]);
			expect(roundToScale([-125n, -1], 0, "floor")).toEqual([-13n, 0]);
			expect(roundToScale([-1275n, -2], 0, "floor")).toEqual([-13n, 0]);
		});

		it("breaks ties strictly in the mode's direction", () => {
			// 12.5 -> 13 | 12 ; -12.5 -> -12 | -13
			expect(roundToScale([125n, -1], 0, "ceil")).toEqual([13n, 0]);
			expect(roundToScale([-125n, -1], 0, "ceil")).toEqual([-12n, 0]);
			expect(roundToScale([125n, -1], 0, "floor")).toEqual([12n, 0]);
			expect(roundToScale([-125n, -1], 0, "floor")).toEqual([-13n, 0]);
			// -12.34 -> -13
			expect(roundToScale([-1234n, -2], 0, "floor")).toEqual([-13n, 0]);
		});
	});

	describe("half modes at exact ties", () => {
		it("half-up ties away from zero", () => {
			expect(roundToScale([125n, -1], 0, "half-up")).toEqual([13n, 0]);
			expect(roundToScale([-125n, -1], 0, "half-up")).toEqual([-13n, 0]);
		});

		it("half-down ties towards zero", () => {
			expect(roundToScale([125n, -1], 0, "half-down")).toEqual([12n, 0]);
			expect(roundToScale([-125n, -1], 0, "half-down")).toEqual([-12n, 0]);
		});

		it("half-even ties to the even neighbour", () => {
			// 12.5 -> 12 (even), 13.5 -> 14 (even)
			expect(roundToScale([125n, -1], 0, "half-even")).toEqual([12n, 0]);
			expect(roundToScale([135n, -1], 0, "half-even")).toEqual([14n, 0]);
			expect(roundToScale([-125n, -1], 0, "half-even")).toEqual([-12n, 0]);
			expect(roundToScale([-135n, -1], 0, "half-even")).toEqual([-14n, 0]);
		});

		it("half-ceil ties towards +Infinity", () => {
			expect(roundToScale([125n, -1], 0, "half-ceil")).toEqual([13n, 0]);
			expect(roundToScale([-125n, -1], 0, "half-ceil")).toEqual([-12n, 0]);
		});

		it("half-floor ties towards -Infinity", () => {
			expect(roundToScale([125n, -1], 0, "half-floor")).toEqual([12n, 0]);
			expect(roundToScale([-125n, -1], 0, "half-floor")).toEqual([-13n, 0]);
		});
	});

	describe("half modes off the tie", () => {
		it("rounds to the nearest neighbour for every mode", () => {
			// 12.4 -> 12, 12.6 -> 13, -12.6 -> -13
			for (const mode of [
				"half-up",
				"half-down",
				"half-even",
				"half-ceil",
				"half-floor",
			] as const) {
				expect(roundToScale([124n, -1], 0, mode)).toEqual([12n, 0]);
				expect(roundToScale([126n, -1], 0, mode)).toEqual([13n, 0]);
				expect(roundToScale([-126n, -1], 0, mode)).toEqual([-13n, 0]);
			}
		});
	});

	describe("carry", () => {
		it("absorbs the carry into the exponent via normalize", () => {
			// 0.999 -> 1.0
			expect(roundToScale([999n, -3], -1, "half-up")).toEqual([1n, 0]);
			// -0.999 -> -1.0
			expect(roundToScale([-999n, -3], -1, "up")).toEqual([-1n, 0]);
			// 9.99 -> 10
			expect(roundToScale([999n, -2], -1, "up")).toEqual([1n, 1]);
		});
	});
});
