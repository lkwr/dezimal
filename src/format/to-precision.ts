import type { RoundingMode } from "dezi";
import { Decimal } from "../decimal.ts";
import { abs, digitsOf } from "../utils/common.ts";
import { currentRounding } from "../utils/config.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";
import { exponentialString, plainString } from "../utils/string.ts";

// required extensions
import "../config/rounding-modes.ts";
import "./to-string.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the value rounded to `sd` significant digits using the given
		 * mode (default: the `Decimal.rounding` mode), in plain notation when
		 * possible and exponential notation otherwise. Without `sd` the exact
		 * display form is returned.
		 */
		toPrecision(sd?: number, mode?: RoundingMode): string;
	}
}

extend(
	"toPrecision",
	function toPrecision(
		this: Decimal,
		sd?: number,
		mode?: RoundingMode,
	): string {
		if (sd === undefined) return this.toString();
		if (!Number.isInteger(sd) || sd < 1) {
			throw new RangeError(
				`Invalid significant digits: expected a positive integer, got ${sd}`,
			);
		}
		const digitCount = digitsOf(this.coefficient);
		const [roundedCoefficient, roundedExponent] = roundToScale(
			this.raw,
			this.exponent + digitCount - sd,
			currentRounding(mode),
		);
		// dezi has no signed zero, so a zero result is always bare.
		if (roundedCoefficient === 0n) {
			return sd > 1 ? `0.${"0".repeat(sd - 1)}` : "0";
		}
		const sign = roundedCoefficient < 0n ? "-" : "";
		const digits = abs(roundedCoefficient).toString();
		// Recomputed after rounding: the carry in 999.96 -> 1000 moves it.
		const leadingPower = digits.length + roundedExponent - 1;
		if (leadingPower > Decimal.minPlainExponent && leadingPower < sd) {
			// The stored coefficient is normalized, which strips the trailing
			// zeros the sd-digit form needs: re-pad to sd digits, which stand
			// for coefficient × 10^(leadingPower - sd + 1).
			return plainString(sign, digits.padEnd(sd, "0"), leadingPower - sd + 1);
		}
		return exponentialString(sign, digits, leadingPower, sd);
	},
);
