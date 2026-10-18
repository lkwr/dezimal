import { describe, expect, it } from "vitest";
import { Decimal, type DecimalLike, type RawDecimal } from "../src/decimal.ts";

describe("constructor statics", () => {
	it("exposes the built-in static members", () => {
		expect(Decimal.name).toBe("Decimal");
		expect(Decimal.exponentLimit).toBe(999_999);
	});

	it("is instantiable through the constructor interface", () => {
		expect(new Decimal(1)).toBeInstanceOf(Decimal);
	});
});

describe("construction", () => {
	it("accepts decimal strings", () => {
		expect(new Decimal("123").raw).toEqual([123n, 0]);
		expect(new Decimal("1.5").raw).toEqual([15n, -1]);
	});

	it("accepts signed and leading-dot strings", () => {
		expect(new Decimal("+1.5").raw).toEqual([15n, -1]);
		expect(new Decimal("-1.5").raw).toEqual([-15n, -1]);
		expect(new Decimal(".5").raw).toEqual([5n, -1]);
		expect(new Decimal("-.5").raw).toEqual([-5n, -1]);
	});

	it("accepts exponential strings", () => {
		expect(new Decimal("1e20").raw).toEqual([1n, 20]);
		expect(new Decimal(1e20).raw).toEqual([1n, 20]);
		expect(new Decimal("1e-3").raw).toEqual([1n, -3]);
	});

	it("accepts numbers and bigints", () => {
		expect(new Decimal(1.5).raw).toEqual([15n, -1]);
		expect(new Decimal(-3).raw).toEqual([-3n, 0]);
		expect(new Decimal(0).raw).toEqual([0n, 0]);
		expect(new Decimal(123n).raw).toEqual([123n, 0]);
		expect(new Decimal(-5n).raw).toEqual([-5n, 0]);
	});

	it("normalizes trailing zeros from any input", () => {
		// 1.50 -> 1.5, 150 -> 1.5e2
		expect(new Decimal("1.50").raw).toEqual([15n, -1]);
		expect(new Decimal(150n).raw).toEqual([15n, 1]);
		expect(new Decimal([120n, -2]).raw).toEqual([12n, -1]);
	});

	it("canonicalizes zero to [0n, 0]", () => {
		expect(new Decimal("-0").raw).toEqual([0n, 0]);
		expect(new Decimal("0.0").raw).toEqual([0n, 0]);
		expect(new Decimal([0n, 5]).raw).toEqual([0n, 0]);
	});

	it("copies coefficient and exponent from an existing Decimal", () => {
		const source = new Decimal([12n, -1]);
		const copy = new Decimal(source);
		expect(copy).not.toBe(source);
		expect(copy.raw).toEqual(source.raw);
	});

	it("keeps huge exponents within the limit", () => {
		const huge = new Decimal("1e999999");
		expect(huge.raw).toEqual([1n, 999_999]);
	});
});

describe("raw", () => {
	it("returns the coefficient/exponent pair", () => {
		const decimal = new Decimal("1.5");
		expect(decimal.raw).toEqual([15n, -1]);
		expect(decimal.coefficient).toBe(15n);
		expect(decimal.exponent).toBe(-1);
		expect(decimal.raw).toEqual([decimal.coefficient, decimal.exponent]);
	});

	it("returns a detached tuple that can be mutated safely", () => {
		const tuple = new Decimal("1.5").raw;
		tuple.push(0n);
		expect(tuple.length).toBe(3);
		expect(new Decimal("1.5").raw).toEqual([15n, -1]);
	});
});

describe("[Symbol.toStringTag]", () => {
	it("labels instances as Decimal", () => {
		expect(new Decimal("1")[Symbol.toStringTag]).toBe("Decimal");
		expect(Object.prototype.toString.call(new Decimal("1"))).toBe(
			"[object Decimal]",
		);
	});
});

describe("readonly members", () => {
	it("forbid member assignment at compile time", () => {
		// @ts-expect-error - coefficient is readonly
		new Decimal("1.5").coefficient = 1n;
		// @ts-expect-error - exponent is readonly
		new Decimal("1.5").exponent = 0;
		// TypeScript enforces the contract statically; runtime instances are
		// unaffected by the throwaway assignments above.
		expect(new Decimal("1.5").raw).toEqual([15n, -1]);
	});
});

describe("errors", () => {
	it("throws TypeError for unparseable strings", () => {
		expect(() => new Decimal("1.2.3")).toThrow(TypeError);
		expect(() => new Decimal("")).toThrow(TypeError);
	});

	it("throws TypeError for invalid objects", () => {
		expect(() => new Decimal({} as unknown as DecimalLike)).toThrow(TypeError);
		expect(() => new Decimal([1n] as unknown as RawDecimal)).toThrow(TypeError);
		expect(() => new Decimal(null as unknown as DecimalLike)).toThrow(
			TypeError,
		);
	});

	it("throws RangeError for non-finite numbers", () => {
		expect(() => new Decimal(Number.POSITIVE_INFINITY)).toThrow(RangeError);
		expect(() => new Decimal(Number.NaN)).toThrow(RangeError);
	});

	it("throws RangeError for exponents beyond the limit", () => {
		expect(() => new Decimal("1e1000000")).toThrow(RangeError);
		expect(() => new Decimal("1e-1000000")).toThrow(RangeError);
	});
});

describe("primitive conversion", () => {
	it("throws on numeric and default coercion", () => {
		const one = new Decimal(1);
		const two = new Decimal(2);
		expect(() => one < two).toThrow(TypeError);
		expect(() => +one).toThrow(TypeError);
		// biome-ignore lint/style/useTemplate: exercising default coercion
		expect(() => "total: " + one).toThrow(TypeError);
	});

	it("converts in string contexts", () => {
		// Without the to-string extension the tag-based object string is used.
		expect(String(new Decimal(1))).toBe("[object Decimal]");
	});
});
