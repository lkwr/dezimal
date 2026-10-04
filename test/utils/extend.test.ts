import { describe, expect, it } from "vitest";
import { Decimal, Decimal as DecimalConstructor } from "../../src/decimal.ts";
import { extend, extendStatic } from "../../src/utils/extend.ts";

// tap/peek exist only so `extend`'s keyof-typed arguments compile; they are
// registered fresh in every test and never collide with real ops. tapLimit/
// peekLimit do the same for `extendStatic`.
declare module "dezi" {
	interface Decimal {
		tap(callback: (decimal: Decimal) => void): Decimal;
		peek(callback: (decimal: Decimal) => void): Decimal;
	}
	interface DecimalConstructor {
		tapLimit: number;
		peekLimit: number;
	}
}

const tap = function tap(
	this: Decimal,
	callback: (decimal: Decimal) => void,
): Decimal {
	callback(this);
	return this;
};

describe("extend", () => {
	it("registers a method on Decimal.prototype", () => {
		extend("tap", tap);
		expect(Decimal.prototype.tap).toBe(tap);
	});

	it("binds aliases to the same implementation", () => {
		extend("tap", tap, ["peek"]);
		expect(Decimal.prototype.tap).toBe(tap);
		expect(Decimal.prototype.peek).toBe(tap);
	});

	it("behaves normally when called through an alias", () => {
		extend("tap", tap, ["peek"]);
		const decimal = new Decimal(2n);
		let seen: Decimal | undefined;
		expect(
			decimal.peek((other) => {
				seen = other;
			}),
		).toBe(decimal);
		expect(seen).toBe(decimal);
	});
});

describe("extendStatic", () => {
	it("overwrites a static on the constructor", () => {
		const original = DecimalConstructor.tapLimit;
		extendStatic("tapLimit", 50);
		expect(DecimalConstructor.tapLimit).toBe(50);
		DecimalConstructor.tapLimit = original;
	});

	it("binds alias statics to the same value", () => {
		const originalTap = DecimalConstructor.tapLimit;
		const originalPeek = DecimalConstructor.peekLimit;
		extendStatic("tapLimit", 50, ["peekLimit"]);
		expect(DecimalConstructor.tapLimit).toBe(50);
		expect(DecimalConstructor.peekLimit).toBe(50);
		DecimalConstructor.tapLimit = originalTap;
		DecimalConstructor.peekLimit = originalPeek;
	});
});
