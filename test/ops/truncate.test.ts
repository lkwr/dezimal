import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/truncate.ts";

/** Runs `truncate` and returns the normalized raw [coefficient, exponent] tuple. */
const truncate = (value: DecimalLike): RawDecimal =>
	new Decimal(value).truncate().raw;

describe("truncate", () => {
	it("truncates positive fractions towards zero", () => {
		// 12.34 -> 12
		expect(truncate(12.34)).toEqual([12n, 0]);
		// 0.999 -> 0
		expect(truncate(0.999)).toEqual([0n, 0]);
		// 0.0001 -> 0
		expect(truncate(0.0001)).toEqual([0n, 0]);
	});

	it("truncates negative fractions towards zero", () => {
		// -12.34 -> -12
		expect(truncate(-12.34)).toEqual([-12n, 0]);
		// -0.999 -> 0, and zero is always exactly [0n, 0] — never signed
		expect(truncate(-0.999)).toEqual([0n, 0]);
	});

	it("leaves exact integers unchanged", () => {
		expect(truncate(12)).toEqual([12n, 0]);
		expect(truncate(-3)).toEqual([-3n, 0]);
		// 1e20 is already on the unit grid
		expect(truncate("1e20")).toEqual([1n, 20]);
	});

	it("returns [0n, 0] for zero", () => {
		expect(truncate(0n)).toEqual([0n, 0]);
	});

	it("exposes trunc as an alias with identical behavior", () => {
		expect(new Decimal(12.34).trunc().raw).toEqual([12n, 0]);
		expect(new Decimal(-12.34).trunc().raw).toEqual([-12n, 0]);
		expect(new Decimal(0.999).trunc().raw).toEqual([0n, 0]);
		expect(new Decimal(-0.999).trunc().raw).toEqual([0n, 0]);
		expect(new Decimal(12).trunc().raw).toEqual([12n, 0]);
	});
});
