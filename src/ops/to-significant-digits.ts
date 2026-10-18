import type { RoundingMode } from "dezi";
import { Decimal } from "../decimal.ts";
import { digitsOf } from "../utils/common.ts";
import { currentRounding } from "../utils/config.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the value rounded to `sd` significant digits using the given
		 * mode (default: the `Decimal.rounding` mode). Without `sd` the value
		 * is unchanged.
		 */
		toSignificantDigits(sd?: number, mode?: RoundingMode): Decimal;
		toSD(sd?: number, mode?: RoundingMode): Decimal;
	}
}

extend(
	"toSignificantDigits",
	function toSignificantDigits(
		this: Decimal,
		sd?: number,
		mode?: RoundingMode,
	): Decimal {
		if (sd === undefined) return this;
		if (!Number.isInteger(sd) || sd < 1) {
			throw new RangeError(
				`Invalid significant digits: expected a positive integer, got ${sd}`,
			);
		}
		// The coefficient is normalized, so its digit count is the value's
		// significant-digit count: rounding to the 10^target grid leaves `sd`
		// significant digits. roundToScale's on-grid early return keeps already
		// exact values cheap, and its normalization absorbs carries and
		// trailing zeros.
		const digits = digitsOf(this.coefficient);
		return new Decimal(
			roundToScale(
				this.raw,
				this.exponent + digits - sd,
				currentRounding(mode),
			),
		);
	},
	["toSD"],
);
