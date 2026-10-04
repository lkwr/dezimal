import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/floor.ts";
import "../../src/ops/plus.ts";

/** Runs `floor` and returns the normalized raw [coefficient, exponent] tuple. */
const floor = (value: DecimalLike): RawDecimal =>
	new Decimal(value).floor().raw;

describe("floor", () => {
	it("floors positive fractions towards zero", () => {
		// 12.34 -> 12
		expect(floor(12.34)).toEqual([12n, 0]);
		// 0.25 -> 0
		expect(floor(0.25)).toEqual([0n, 0]);
		// 0.0001 -> 0
		expect(floor(0.0001)).toEqual([0n, 0]);
	});

	it("floors negative fractions towards -Infinity", () => {
		// -12.34 -> -13
		expect(floor(-12.34)).toEqual([-13n, 0]);
		// -0.0001 -> -1
		expect(floor(-0.0001)).toEqual([-1n, 0]);
		// -0.75 -> -1
		expect(floor(-0.75)).toEqual([-1n, 0]);
	});

	it("leaves exact integers unchanged", () => {
		expect(floor(12)).toEqual([12n, 0]);
		expect(floor(-3)).toEqual([-3n, 0]);
		// 1e20 is already on the unit grid
		expect(floor("1e20")).toEqual([1n, 20]);
	});

	it("returns [0n, 0] for zero", () => {
		expect(floor(0n)).toEqual([0n, 0]);
	});

	it("chains with plus", () => {
		// 12.34 -> 12 -> 13
		expect(new Decimal(12.34).floor().plus(1).raw).toEqual([13n, 0]);
	});
});
