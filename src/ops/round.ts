import { Decimal } from "../decimal.ts";
import { currentRounding } from "../utils/config.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Rounds to the nearest integer using the `Decimal.rounding` mode;
		 * ties resolve per that mode.
		 */
		round(): Decimal;
	}
}

extend("round", function round(this: Decimal): Decimal {
	return new Decimal(roundToScale(this.raw, 0, currentRounding()));
});
