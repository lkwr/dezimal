import { describe, expect, it } from "vitest";
import { truncDivide } from "../../src/utils/division.ts";

describe("truncDivide", () => {
	it("computes an exact quotient and remainder across scales", () => {
		// 1 = 1 * 0.9 + 0.1
		expect(truncDivide([1n, 0], [9n, -1])).toEqual({
			quotient: [1n, 0],
			remainder: [1n, -1],
		});
		// 5 = 7 * 0.7 + 0.1
		expect(truncDivide([5n, 0], [7n, -1])).toEqual({
			quotient: [7n, 0],
			remainder: [1n, -1],
		});
	});

	it("divides integers", () => {
		expect(truncDivide([8n, 0], [3n, 0])).toEqual({
			quotient: [2n, 0],
			remainder: [2n, 0],
		});
	});

	it("signs the quotient by XOR and the remainder after the dividend", () => {
		// -8 % 3 = -2
		expect(truncDivide([-8n, 0], [3n, 0])).toEqual({
			quotient: [-2n, 0],
			remainder: [-2n, 0],
		});
		// 8 % -3 = 2
		expect(truncDivide([8n, 0], [-3n, 0])).toEqual({
			quotient: [-2n, 0],
			remainder: [2n, 0],
		});
		// -8 % -3 = -2
		expect(truncDivide([-8n, 0], [-3n, 0])).toEqual({
			quotient: [2n, 0],
			remainder: [-2n, 0],
		});
	});

	it("returns the zero pair for a zero dividend", () => {
		expect(truncDivide([0n, 0], [5n, 3])).toEqual({
			quotient: [0n, 0],
			remainder: [0n, 0],
		});
		expect(truncDivide([0n, -7], [-5n, 2])).toEqual({
			quotient: [0n, 0],
			remainder: [0n, 0],
		});
	});

	it("throws when the divisor is zero, including 0/0", () => {
		expect(() => truncDivide([1n, 0], [0n, 0])).toThrow(
			new RangeError("Invalid Decimal operation: division by zero"),
		);
		expect(() => truncDivide([0n, 0], [0n, 0])).toThrow(RangeError);
	});

	it("returns [0n, 0] for exact division", () => {
		expect(truncDivide([-12n, 2], [5n, 1])).toEqual({
			quotient: [-24n, 0],
			remainder: [0n, 0],
		});
		expect(truncDivide([100n, 0], [4n, 0])).toEqual({
			quotient: [25n, 0],
			remainder: [0n, 0],
		});
	});

	it("aligns mixed exponents in both directions", () => {
		// dividend exponent larger: 1000 = 33 * 30 + 10
		expect(truncDivide([1n, 3], [3n, 1])).toEqual({
			quotient: [33n, 0],
			remainder: [1n, 1],
		});
		// dividend exponent smaller: 2.5 = 1 * 2 + 0.5
		expect(truncDivide([25n, -1], [2n, 0])).toEqual({
			quotient: [1n, 0],
			remainder: [5n, -1],
		});
	});

	it("keeps the remainder sign when the quotient truncates to zero", () => {
		// 0.5 = 0 * 3 + 0.5
		expect(truncDivide([50n, -2], [3n, 0])).toEqual({
			quotient: [0n, 0],
			remainder: [5n, -1],
		});
		// -0.5 = 0 * 3 + (-0.5)
		expect(truncDivide([-50n, -2], [3n, 0])).toEqual({
			quotient: [0n, 0],
			remainder: [-5n, -1],
		});
	});

	it("returns normalized values", () => {
		// 10 / 0.02 = 500 -> 5 * 10^2
		expect(truncDivide([1n, 1], [2n, -2]).quotient).toEqual([5n, 2]);
		// 100 % 15 = 10 -> 10 at exponent 0 normalizes to 1 * 10^1
		expect(truncDivide([1n, 2], [15n, 0]).remainder).toEqual([1n, 1]);
		// 0.5 % 3 = 0.5 -> 5 * 10^-1
		expect(truncDivide([50n, -2], [3n, 0]).remainder).toEqual([5n, -1]);
	});
});
