import { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";
import { rootToPrecision } from "../utils/integer-roots.ts";
import { currentPrecision } from "../utils/precision.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the real cube root, sign-preserving for negative values,
		 * rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode.
		 */
		cbrt(): Decimal;
	}
}

extend("cbrt", function cbrt(this: Decimal): Decimal {
	return new Decimal(
		rootToPrecision(this.raw, 3, currentPrecision(), Decimal.rounding),
	);
});
