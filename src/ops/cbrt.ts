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
		 * Returns the real cube root, sign-preserving for negative values,
		 * rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode; `options` override both for this call.
		 */
		cbrt(options?: PrecisionOptions): Decimal;
	}
}

extend(
	"cbrt",
	function cbrt(this: Decimal, options?: PrecisionOptions): Decimal {
		return new Decimal(
			rootToPrecision(
				this.raw,
				3,
				currentPrecision(options?.precision),
				currentRounding(options?.rounding),
			),
		);
	},
);
