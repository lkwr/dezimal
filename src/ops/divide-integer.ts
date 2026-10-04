import { Decimal, type DecimalLike } from "../decimal.ts";
import { digitsOf, normalize } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { truncDivide } from "../utils/integer-division.ts";
import { parse } from "../utils/parse.ts";
import { roundToScale } from "../utils/rounding.ts";

// required extensions
import "../config/precision.ts";
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the integer part of the division, truncated towards zero,
		 * rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode.
		 */
		divideInteger(other: DecimalLike): Decimal;
		/**
		 * Returns the integer part of the division, truncated towards zero,
		 * rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode.
		 */
		divToInt(other: DecimalLike): Decimal;
	}
}

/**
 * Truncating long-division of `self` by `other`, with the integer quotient
 * rounded to `Decimal.precision` significant digits using `Decimal.rounding`.
 */
const divideIntegers = (self: DecimalLike, other: DecimalLike): Decimal => {
	const { quotient } = truncDivide(
		normalize(parse(self)),
		normalize(parse(other)),
	);
	const [coefficient, exponent] = quotient;

	// A zero quotient carries no digits to round, so like divide's
	// zero-dividend early return it bypasses the precision guard.
	if (coefficient === 0n) {
		return new Decimal(quotient);
	}

	// Precision is user-mutable without validation until a `set()` extension.
	if (Decimal.precision < 1) {
		throw new RangeError(
			`Invalid Decimal precision: expected a positive integer, got ${Decimal.precision}`,
		);
	}

	// truncDivide returns a normalized quotient, so the integer value has
	// digits + exponent written digits; keeping `Decimal.precision` of them
	// significant means quantizing onto the 10^(digits + exponent - precision)
	// grid. When digits <= precision the target sits at or below the quotient's
	// exponent and roundToScale's on-grid early return keeps the value as-is.
	const digits = digitsOf(coefficient);
	return new Decimal(
		roundToScale(
			quotient,
			digits + exponent - Decimal.precision,
			Decimal.rounding,
		),
	);
};

extend(
	"divideInteger",
	function divideInteger(this: Decimal, other: DecimalLike): Decimal {
		return divideIntegers(this, other);
	},
	["divToInt"],
);
