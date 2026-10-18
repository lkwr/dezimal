import { Decimal, type DecimalLike } from "../decimal.ts";
import { divideToPrecision } from "../utils/division.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";
import { currentPrecision } from "../utils/precision.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns this value divided by the other, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode. Throws a RangeError when dividing by zero.
		 */
		divide(other: DecimalLike): Decimal;
		/**
		 * Returns this value divided by the other, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode. Throws a RangeError when dividing by zero.
		 */
		div(other: DecimalLike): Decimal;
	}
}

extend(
	"divide",
	function divide(this: Decimal, other: DecimalLike): Decimal {
		return new Decimal(
			divideToPrecision(
				this.raw,
				parse(other),
				currentPrecision(),
				Decimal.rounding,
			),
		);
	},
	["div"],
);
