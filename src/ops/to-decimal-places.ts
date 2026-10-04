import type { RoundingMode } from "dezi";
import { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the value rounded to `dp` decimal places using `mode`,
		 * defaulting to the `Decimal.rounding` mode. Without `dp` the value is
		 * unchanged.
		 */
		toDecimalPlaces(dp?: number, mode?: RoundingMode): Decimal;
		toDP(dp?: number, mode?: RoundingMode): Decimal;
	}
}

extend(
	"toDecimalPlaces",
	function toDecimalPlaces(
		this: Decimal,
		dp?: number,
		mode?: RoundingMode,
	): Decimal {
		if (dp === undefined) return this;
		if (!Number.isInteger(dp) || dp < 0) {
			throw new RangeError(
				`Invalid decimal places: expected a non-negative integer, got ${dp}`,
			);
		}
		return new Decimal(
			roundToScale(
				[this.coefficient, this.exponent],
				-dp,
				mode ?? Decimal.rounding,
			),
		);
	},
	["toDP"],
);
