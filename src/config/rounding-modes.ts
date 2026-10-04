import { extendStatic } from "../utils/extend.ts";

// EUCLID (a decimal.js constant with value 9) is not a rounding mode: it
// selects a modulo-division variant, planned with the `modulo` config.
declare module "dezi" {
	export type RoundingMode =
		| "up"
		| "down"
		| "ceil"
		| "floor"
		| "half-up"
		| "half-down"
		| "half-even"
		| "half-ceil"
		| "half-floor";

	interface DecimalConstructor {
		/**
		 * Default rounding mode used by precision-based operations. Modes:
		 * "up" (away from zero), "down" (towards zero), "ceil" (towards
		 * +Infinity), "floor" (towards -Infinity), "half-up" (nearest, ties
		 * away from zero), "half-down" (nearest, ties towards zero),
		 * "half-even" (nearest, ties to the even neighbour), "half-ceil"
		 * (nearest, ties towards +Infinity), "half-floor" (nearest, ties
		 * towards -Infinity). Default: "half-up".
		 */
		rounding: RoundingMode;
	}
}

extendStatic("rounding", "half-up");
