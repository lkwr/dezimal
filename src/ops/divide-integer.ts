import { Decimal, type DecimalLike } from "../decimal.ts";
import { truncDivide } from "../utils/division.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";
import { currentPrecision } from "../utils/precision.ts";
import { roundToPrecision } from "../utils/rounding.ts";

// required extensions
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

extend(
	"divideInteger",
	function divideInteger(this: Decimal, other: DecimalLike): Decimal {
		const { quotient } = truncDivide(this.raw, parse(other));
		// A zero quotient carries no digits to round.
		if (quotient[0] === 0n) {
			return new Decimal(0n);
		}
		return new Decimal(
			roundToPrecision(quotient, currentPrecision(), Decimal.rounding),
		);
	},
	["divToInt"],
);
