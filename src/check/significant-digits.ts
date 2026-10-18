import type { Decimal } from "../decimal.ts";
import { digitsOf } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns the number of significant digits of the value. Stored values
		 * are normalized, so trailing zeros are never counted; zero counts as
		 * one digit.
		 */
		significantDigits(): number;
		/**
		 * Returns the number of significant digits of the value. Stored values
		 * are normalized, so trailing zeros are never counted; zero counts as
		 * one digit.
		 */
		sd(): number;
	}
}

extend(
	"significantDigits",
	function significantDigits(this: Decimal): number {
		return digitsOf(this.coefficient);
	},
	["sd"],
);
