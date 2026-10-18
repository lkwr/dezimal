import type { PrecisionOptions } from "dezi";
import { Decimal } from "../decimal.ts";
import { currentPrecision, currentRounding } from "../utils/config.ts";
import { expToPrecision } from "../utils/exponential.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "../config/precision.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns e (Euler's number) raised to this value, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode; `options` override both for this call. Throws a RangeError
		 * when the result leaves the exponent limit.
		 */
		exp(options?: PrecisionOptions): Decimal;
	}
}

extend("exp", function exp(this: Decimal, options?: PrecisionOptions): Decimal {
	return new Decimal(
		expToPrecision(
			this.raw,
			currentPrecision(options?.precision),
			currentRounding(options?.rounding),
		),
	);
});
