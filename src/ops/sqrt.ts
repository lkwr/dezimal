import type { PrecisionOptions } from "dezi";
import { Decimal } from "../decimal.ts";
import { currentPrecision, currentRounding } from "../utils/config.ts";
import { extend } from "../utils/extend.ts";
import { rootToPrecision } from "../utils/integer-roots.ts";

// required extensions
import "../config/precision.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the square root, rounded to `Decimal.precision` significant
		 * digits using the `Decimal.rounding` mode; `options` override both
		 * for this call. Throws a RangeError for negative values.
		 */
		sqrt(options?: PrecisionOptions): Decimal;
	}
}

extend(
	"sqrt",
	function sqrt(this: Decimal, options?: PrecisionOptions): Decimal {
		if (this.coefficient < 0n) {
			throw new RangeError(
				"Invalid Decimal operation: square root of a negative value",
			);
		}
		return new Decimal(
			rootToPrecision(
				this.raw,
				2,
				currentPrecision(options?.precision),
				currentRounding(options?.rounding),
			),
		);
	},
);
