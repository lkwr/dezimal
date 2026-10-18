import type { PrecisionOptions } from "dezimal";
import { Decimal, type DecimalLike } from "../decimal.ts";
import { currentPrecision, currentRounding } from "../utils/config.ts";
import { divideToPrecision } from "../utils/division.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

// required extensions
import "../config/precision.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns this value divided by the other, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode; `options` override both for this call. Throws a RangeError
		 * when dividing by zero.
		 */
		divide(other: DecimalLike, options?: PrecisionOptions): Decimal;
		/**
		 * Returns this value divided by the other, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode; `options` override both for this call. Throws a RangeError
		 * when dividing by zero.
		 */
		div(other: DecimalLike, options?: PrecisionOptions): Decimal;
	}
}

extend(
	"divide",
	function divide(
		this: Decimal,
		other: DecimalLike,
		options?: PrecisionOptions,
	): Decimal {
		return new Decimal(
			divideToPrecision(
				this.raw,
				parse(other),
				currentPrecision(options?.precision),
				currentRounding(options?.rounding),
			),
		);
	},
	["div"],
);
