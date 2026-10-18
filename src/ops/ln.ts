import { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";
import { lnToPrecision } from "../utils/logarithm.ts";
import { currentPrecision } from "../utils/precision.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the natural logarithm, rounded to `Decimal.precision`
		 * significant digits using the `Decimal.rounding` mode. Throws a
		 * RangeError for non-positive values.
		 */
		ln(): Decimal;
	}
}

extend("ln", function ln(this: Decimal): Decimal {
	return new Decimal(
		lnToPrecision(this.raw, currentPrecision(), Decimal.rounding),
	);
});
