import { Decimal } from "../decimal.ts";
import { expToPrecision } from "../utils/exponential.ts";
import { extend } from "../utils/extend.ts";
import { currentPrecision } from "../utils/precision.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns e (Euler's number) raised to this value, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode. Throws a RangeError when the result leaves the exponent limit.
		 */
		exp(): Decimal;
	}
}

extend("exp", function exp(this: Decimal): Decimal {
	return new Decimal(
		expToPrecision(this.raw, currentPrecision(), Decimal.rounding),
	);
});
