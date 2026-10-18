import type { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns the number of digits after the decimal point. Stored values
		 * are normalized, so insignificant trailing zeros are never counted.
		 *
		 * Zero always returns 0.
		 */
		decimalPlaces(): number;
		/**
		 * Returns the number of digits after the decimal point. Stored values
		 * are normalized, so insignificant trailing zeros are never counted.
		 *
		 * Zero always returns 0.
		 */
		dp(): number;
	}
}

extend(
	"decimalPlaces",
	function decimalPlaces(this: Decimal): number {
		return this.exponent < 0 ? -this.exponent : 0;
	},
	["dp"],
);
