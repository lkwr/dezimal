import type { Decimal, DecimalLike, RawDecimal } from "../decimal.ts";
import { digitsOf, pow10 } from "../utils/common.ts";
import { extend, extendStatic } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezimal" {
	interface Decimal {
		/** Returns -1, 0 or 1 as this value is smaller than, equal to or bigger than `other`. */
		compare(other: DecimalLike): -1 | 0 | 1;
	}

	interface DecimalConstructor {
		/** Returns -1, 0 or 1 as `a` is smaller than, equal to or bigger than `b`. */
		compare(a: DecimalLike, b: DecimalLike): -1 | 0 | 1;
	}
}

const order = (a: bigint, b: bigint): -1 | 0 | 1 =>
	a < b ? -1 : a > b ? 1 : 0;

/** Orders two normalized raw decimals. */
const compareRaw = (
	[aCoefficient, aExponent]: RawDecimal,
	[bCoefficient, bExponent]: RawDecimal,
): -1 | 0 | 1 => {
	// Equal exponents (including zero against zero) compare coefficients.
	if (aExponent === bExponent) return order(aCoefficient, bCoefficient);

	// Differing signs (zero counting as its own sign) decide outright.
	const aSign = order(aCoefficient, 0n);
	const bSign = order(bCoefficient, 0n);
	if (aSign !== bSign) return aSign < bSign ? -1 : 1;

	// Same nonzero sign: the leading digit positions order the magnitudes.
	const leading =
		digitsOf(aCoefficient) + aExponent - digitsOf(bCoefficient) - bExponent;
	if (leading !== 0) return leading > 0 === aSign > 0 ? 1 : -1;

	// Same leading position: the exponent gap equals the digit-count gap, so
	// aligning the coefficients costs at most one coefficient's width.
	return aExponent > bExponent
		? order(aCoefficient * pow10(aExponent - bExponent), bCoefficient)
		: order(aCoefficient, bCoefficient * pow10(bExponent - aExponent));
};

extend("compare", function compare(this: Decimal, other: DecimalLike):
	| -1
	| 0
	| 1 {
	return compareRaw(this.raw, parse(other));
});

extendStatic("compare", function compare(a: DecimalLike, b: DecimalLike):
	| -1
	| 0
	| 1 {
	return compareRaw(parse(a), parse(b));
});
