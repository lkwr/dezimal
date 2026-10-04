import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/round.ts";

/** Runs `round` and returns the normalized raw [coefficient, exponent] tuple. */
const round = (value: DecimalLike): RawDecimal =>
	new Decimal(value).round().raw;

describe("round", () => {
	it("rounds to the nearest integer with the default half-up mode", () => {
		// 12.5 -> 13, ties away from zero
		expect(round("12.5")).toEqual([13n, 0]);
		expect(round("-12.5")).toEqual([-13n, 0]);
		// the discarded part is below half: no increment
		expect(round("12.49")).toEqual([12n, 0]);
		expect(round("-12.49")).toEqual([-12n, 0]);
	});

	it("half-even ties to the even neighbour", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "half-even";
			// 12.5 -> 12 (even), 13.5 -> 14 (even)
			expect(round("12.5")).toEqual([12n, 0]);
			expect(round("13.5")).toEqual([14n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("half-down ties towards zero", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "half-down";
			// 12.5 -> 12
			expect(round("12.5")).toEqual([12n, 0]);
			expect(round("-12.5")).toEqual([-12n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("half-ceil ties towards +Infinity", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "half-ceil";
			// -12.5 -> -12, 12.5 -> 13
			expect(round("-12.5")).toEqual([-12n, 0]);
			expect(round("12.5")).toEqual([13n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("half-floor ties towards -Infinity", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "half-floor";
			// -12.5 -> -13
			expect(round("-12.5")).toEqual([-13n, 0]);
			expect(round("12.5")).toEqual([12n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("up breaks away from zero", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "up";
			// any discarded part increments the magnitude
			expect(round("12.1")).toEqual([13n, 0]);
			expect(round("12.5")).toEqual([13n, 0]);
			expect(round("-12.1")).toEqual([-13n, 0]);
			expect(round("-12.5")).toEqual([-13n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("down breaks towards zero", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "down";
			// any discarded part is dropped
			expect(round("12.9")).toEqual([12n, 0]);
			expect(round("12.5")).toEqual([12n, 0]);
			expect(round("-12.9")).toEqual([-12n, 0]);
			expect(round("-12.5")).toEqual([-12n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("ceil breaks towards +Infinity", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "ceil";
			expect(round("12.1")).toEqual([13n, 0]);
			expect(round("12.5")).toEqual([13n, 0]);
			// negative values move right on the number line
			expect(round("-12.1")).toEqual([-12n, 0]);
			expect(round("-12.9")).toEqual([-12n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("floor breaks towards -Infinity", () => {
		const rounding = Decimal.rounding;
		try {
			Decimal.rounding = "floor";
			// positive values move left on the number line
			expect(round("12.1")).toEqual([12n, 0]);
			expect(round("12.9")).toEqual([12n, 0]);
			expect(round("-12.1")).toEqual([-13n, 0]);
			expect(round("-12.9")).toEqual([-13n, 0]);
		} finally {
			Decimal.rounding = rounding;
		}
	});

	it("leaves exact integers unchanged", () => {
		expect(round(12n)).toEqual([12n, 0]);
		expect(round(-12n)).toEqual([-12n, 0]);
		// 1e20 is already on the unit grid
		expect(round("1e20")).toEqual([1n, 20]);
		// trailing zeros are normalized: "12.00" is exactly 12
		expect(round("12.00")).toEqual([12n, 0]);
	});

	it("returns [0n, 0] for zero", () => {
		expect(round(0)).toEqual([0n, 0]);
		// -0.4 discards a sub-half part onto zero
		expect(round("-0.4")).toEqual([0n, 0]);
	});
});
