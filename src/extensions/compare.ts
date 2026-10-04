import type { Decimal, DecimalLike } from "../decimal.ts";
import { abs, normalize } from "../utils/common.ts";
import { extend, extendStatic } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns -1, 0 or 1 as this value is smaller than, equal to or bigger than `other`. */
		compare(other: DecimalLike): number;
	}

	interface DecimalConstructor {
		/** Returns -1, 0 or 1 as `a` is smaller than, equal to or bigger than `b`. */
		compare(a: DecimalLike, b: DecimalLike): number;
	}
}

const sign = (coefficient: bigint): number =>
	coefficient < 0n ? -1 : coefficient > 0n ? 1 : 0;

/** Compares the magnitude of two same-sign (possibly zero) decimals. */
const compareMagnitude = (
	[aCoefficient, aExponent]: [bigint, number],
	[bCoefficient, bExponent]: [bigint, number],
): number => {
	const aDigits = abs(aCoefficient).toString();
	const bDigits = abs(bCoefficient).toString();

	// The digit count plus the exponent orders the absolute values, e.g.
	// "9.99" (3 digits, -2) vs "10" (2 digits, 0) -> 1 vs 2. Comparing the
	// padded digit strings breaks ties without multiplying big exponents out.
	const order = aDigits.length - bDigits.length + aExponent - bExponent;
	if (order !== 0) return order;

	const width = Math.max(aDigits.length, bDigits.length);
	const aPadded = aDigits.padEnd(width, "0");
	const bPadded = bDigits.padEnd(width, "0");
	return aPadded < bPadded ? -1 : aPadded > bPadded ? 1 : 0;
};

const compareDecimals = (a: DecimalLike, b: DecimalLike): number => {
	const aRaw = normalize(parse(a));
	const bRaw = normalize(parse(b));

	const aSign = sign(aRaw[0]);
	const bSign = sign(bRaw[0]);
	if (aSign !== bSign) return aSign < bSign ? -1 : 1;

	const magnitude = compareMagnitude(aRaw, bRaw);
	return aSign < 0 ? -magnitude : magnitude;
};

extend("compare", function compare(this: Decimal, other: DecimalLike): number {
	return compareDecimals(this, other);
});

extendStatic(
	"compare",
	function compare(a: DecimalLike, b: DecimalLike): number {
		return compareDecimals(a, b);
	},
);
