import type { RoundingMode } from "dezimal";
import { Decimal } from "../decimal.ts";
import { currentRounding } from "../utils/config.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";

// required extensions
import "../config/rounding-modes.ts";
import "./to-plain-string.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns the value in plain (non-exponential) notation with `dp`
		 * decimal places, padded with zeros, rounded using `mode` (default:
		 * the `Decimal.rounding` mode). Without `dp` the full exact expansion
		 * is returned.
		 */
		toFixed(dp?: number, mode?: RoundingMode): string;
	}
}

extend(
	"toFixed",
	function toFixed(this: Decimal, dp?: number, mode?: RoundingMode): string {
		if (dp === undefined) return this.toPlainString();
		if (!Number.isInteger(dp) || dp < 0) {
			throw new RangeError(
				`Invalid decimal places: expected a non-negative integer, got ${dp}`,
			);
		}
		// The on-grid early return in roundToScale keeps huge dp cheap;
		// The rounded value has at most dp fraction digits, which toPlainString(dp)
		// pads to exactly dp.
		return new Decimal(
			roundToScale(this.raw, -dp, currentRounding(mode)),
		).toPlainString(dp);
	},
);
