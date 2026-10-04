import { describe, expect, it } from "vitest";
import { Decimal, type RawDecimal } from "../../src/decimal.ts";
import "../../src/ops/clamp.ts";

describe("clamp", () => {
	it("clamps values below the range to min", () => {
		// -5 clamped to [0, 10] -> 0
		expect(new Decimal(-5).clamp(0, 10).raw).toEqual([0n, 0]);
		// -1.5 clamped to [0.5, 10] -> 0.5
		expect(new Decimal(-1.5).clamp("0.5", 10).raw).toEqual([5n, -1]);
	});

	it("clamps values above the range to max", () => {
		// 15 clamped to [0, 10] -> 10 (normalized as 1e1)
		expect(new Decimal(15).clamp(0, 10).raw).toEqual([1n, 1]);
		// 1e20 clamped to [0, 999] -> 999
		expect(new Decimal("1e20").clamp("0", "999").raw).toEqual([999n, 0]);
	});

	it("returns this when the value is in range", () => {
		const value = new Decimal(5);
		expect(value.clamp(0, 10)).toBe(value);
	});

	it("includes both boundaries", () => {
		expect(new Decimal(0).clamp(0, 10).raw).toEqual([0n, 0]);
		expect(new Decimal(10).clamp(0, 10).raw).toEqual([1n, 1]);
		expect(new Decimal("0.5").clamp("0.5", "0.5").raw).toEqual([5n, -1]);
	});

	it("handles negative ranges", () => {
		expect(new Decimal(-12).clamp(-10, -1).raw).toEqual([-1n, 1]);
		expect(new Decimal(0).clamp(-10, -1).raw).toEqual([-1n, 0]);
		expect(new Decimal(-5.5).clamp("-10", "-1").raw).toEqual([-55n, -1]);
	});

	it("accepts every DecimalLike argument", () => {
		const value = new Decimal(5);
		expect(value.clamp("0", 10)).toBe(value);
		expect(value.clamp(-20n, 10)).toBe(value);
		expect(value.clamp(new Decimal(0), [10n, 0] satisfies RawDecimal)).toBe(
			value,
		);
	});

	it("allows equal bounds", () => {
		expect(new Decimal(5).clamp(2, 2).raw).toEqual([2n, 0]);
	});

	it("throws RangeError when min exceeds max", () => {
		expect(() => new Decimal(5).clamp(10, 0)).toThrow(
			new RangeError("Invalid Decimal clamp: min exceeds max"),
		);
		expect(() => new Decimal(5).clamp("-1", "-2")).toThrow(RangeError);
	});

	it("throws TypeError on invalid input", () => {
		expect(() => new Decimal(5).clamp("x", 10)).toThrow(TypeError);
		expect(() => new Decimal(5).clamp(0, {} as unknown as never)).toThrow(
			TypeError,
		);
	});
});
