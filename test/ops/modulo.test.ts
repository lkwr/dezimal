import { describe, expect, it } from "vitest";
import {
	Decimal,
	type DecimalLike,
	type RawDecimal,
} from "../../src/decimal.ts";
import "../../src/ops/modulo.ts";

/** Runs `modulo` and returns the normalized raw [coefficient, exponent] tuple. */
const modulo = (self: DecimalLike, other: DecimalLike): RawDecimal =>
	new Decimal(self).modulo(other).raw;

describe("modulo", () => {
	it("matches the JavaScript % sign table", () => {
		// 8 % 3 = 2
		expect(modulo(8n, 3n)).toEqual([2n, 0]);
		// 8 % -3 = 2
		expect(modulo(8n, -3n)).toEqual([2n, 0]);
		// -8 % 3 = -2
		expect(modulo(-8n, 3n)).toEqual([-2n, 0]);
		// -8 % -3 = -2
		expect(modulo(-8n, -3n)).toEqual([-2n, 0]);
	});

	it("returns the dividend when it is smaller in magnitude", () => {
		// 0.5 % 1 = 0.5
		expect(modulo(0.5, 1)).toEqual([5n, -1]);
		// -0.5 % 1 = -0.5
		expect(modulo(-0.5, 1)).toEqual([-5n, -1]);
	});

	it("computes exact remainders for decimals", () => {
		// 1.5 = 3 * 0.4 + 0.3
		expect(modulo(1.5, 0.4)).toEqual([3n, -1]);
		// 1 = 1 * 0.9 + 0.1
		expect(modulo(1, 0.9)).toEqual([1n, -1]);
	});

	it("is exact for large values", () => {
		// 1e20 % 3 = 1
		expect(modulo("1e20", 3)).toEqual([1n, 0]);
		// 100000000000000000001 = 33333333333333333333 * 3 + 2; a float64
		// dividend would lose the trailing digit and yield 1 instead
		expect(modulo("100000000000000000001", 3)).toEqual([2n, 0]);
	});

	it("returns [0n, 0] for a zero dividend", () => {
		expect(modulo(0, 5)).toEqual([0n, 0]);
		expect(modulo("0.00", -3n)).toEqual([0n, 0]);
	});

	it("throws on a zero divisor, including 0 % 0", () => {
		expect(() => new Decimal(1).modulo(0)).toThrow(
			new RangeError("Invalid Decimal operation: division by zero"),
		);
		expect(() => new Decimal(0).modulo(0)).toThrow(RangeError);
	});

	it("accepts every DecimalLike input", () => {
		const self = new Decimal(8);
		expect(modulo(self, "3")).toEqual([2n, 0]);
		expect(modulo(self, 3)).toEqual([2n, 0]);
		expect(modulo(self, 3n)).toEqual([2n, 0]);
		expect(modulo(self, new Decimal(3))).toEqual([2n, 0]);
		expect(modulo(self, [3n, 0] satisfies RawDecimal)).toEqual([2n, 0]);
	});

	it("exposes mod as an alias", () => {
		expect(new Decimal(8).mod(3n).raw).toEqual([2n, 0]);
	});
});
