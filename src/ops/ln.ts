import type { PrecisionOptions } from "dezimal";
import { Decimal } from "../decimal.ts";
import { currentPrecision, currentRounding } from "../utils/config.ts";
import { extend } from "../utils/extend.ts";
import { lnToPrecision } from "../utils/logarithm.ts";

// required extensions
import "../config/precision.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns the natural logarithm, rounded to `Decimal.precision`
		 * significant digits using the `Decimal.rounding` mode; `options`
		 * override both for this call. Throws a RangeError for non-positive
		 * values.
		 */
		ln(options?: PrecisionOptions): Decimal;
	}
}

extend("ln", function ln(this: Decimal, options?: PrecisionOptions): Decimal {
	return new Decimal(
		lnToPrecision(
			this.raw,
			currentPrecision(options?.precision),
			currentRounding(options?.rounding),
		),
	);
});
