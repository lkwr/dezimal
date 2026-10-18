import type { RoundingMode } from "dezimal";
import type { Decimal } from "../decimal.ts";
import { abs, digitsOf } from "../utils/common.ts";
import { currentRounding } from "../utils/config.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";
import { exponentialString } from "../utils/string.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns the value in exponential notation with `dp` digits after the
		 * point, rounded with the given mode (default: the `Decimal.rounding`
		 * mode). Without `dp` all significant digits are emitted.
		 */
		toExponential(dp?: number, mode?: RoundingMode): string;
	}
}

extend(
	"toExponential",
	function toExponential(
		this: Decimal,
		dp?: number,
		mode?: RoundingMode,
	): string {
		if (dp === undefined) {
			const digits = abs(this.coefficient).toString();
			const leadingPower = digits.length + this.exponent - 1;
			return exponentialString(
				this.coefficient < 0n ? "-" : "",
				digits,
				leadingPower,
			);
		}
		if (!Number.isInteger(dp) || dp < 0) {
			throw new RangeError(
				`Invalid decimal places: expected a non-negative integer, got ${dp}`,
			);
		}
		// The target exponent places the value on the grid of dp+1 significant
		// digits; roundToScale's on-grid early return keeps huge dp cheap.
		// Rounding may carry (9.99 -> 1.0e+1), so the leading power is
		// recomputed from the rounded value and exponentialString pads the
		// fraction back to exactly dp digits.
		const digitCount = digitsOf(this.coefficient);
		const [roundedCoefficient, roundedExponent] = roundToScale(
			this.raw,
			this.exponent + digitCount - (dp + 1),
			currentRounding(mode),
		);
		const digits = abs(roundedCoefficient).toString();
		const leadingPower = digits.length + roundedExponent - 1;
		return exponentialString(
			roundedCoefficient < 0n ? "-" : "",
			digits,
			leadingPower,
			dp + 1,
		);
	},
);
