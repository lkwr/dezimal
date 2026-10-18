import { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";
import { rootToPrecision } from "../utils/integer-roots.ts";
import { currentPrecision } from "../utils/precision.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the square root, rounded to `Decimal.precision` significant
		 * digits using the `Decimal.rounding` mode. Throws a RangeError for
		 * negative values.
		 */
		sqrt(): Decimal;
	}
}

extend("sqrt", function sqrt(this: Decimal): Decimal {
	if (this.coefficient < 0n) {
		throw new RangeError(
			"Invalid Decimal operation: square root of a negative value",
		);
	}
	return new Decimal(
		rootToPrecision(this.raw, 2, currentPrecision(), Decimal.rounding),
	);
});
