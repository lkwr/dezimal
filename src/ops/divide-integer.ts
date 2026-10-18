import type { PrecisionOptions } from "dezi";
import { Decimal, type DecimalLike } from "../decimal.ts";
import { currentPrecision, currentRounding } from "../utils/config.ts";
import { truncDivide } from "../utils/division.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";
import { roundToPrecision } from "../utils/rounding.ts";

// required extensions
import "../config/precision.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the integer part of the division, truncated towards zero,
		 * rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode; `options` override both for this call.
		 */
		divideInteger(other: DecimalLike, options?: PrecisionOptions): Decimal;
		/**
		 * Returns the integer part of the division, truncated towards zero,
		 * rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode; `options` override both for this call.
		 */
		divToInt(other: DecimalLike, options?: PrecisionOptions): Decimal;
	}
}

extend(
	"divideInteger",
	function divideInteger(
		this: Decimal,
		other: DecimalLike,
		options?: PrecisionOptions,
	): Decimal {
		const { quotient } = truncDivide(this.raw, parse(other));
		// A zero quotient carries no digits to round.
		if (quotient[0] === 0n) {
			return new Decimal(0n);
		}
		return new Decimal(
			roundToPrecision(
				quotient,
				currentPrecision(options?.precision),
				currentRounding(options?.rounding),
			),
		);
	},
	["divToInt"],
);
