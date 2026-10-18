import type { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns true if the value is negative. Zero is not negative.
		 */
		isNegative(): boolean;
		isNeg(): boolean;
	}
}

extend(
	"isNegative",
	function isNegative(this: Decimal): boolean {
		return this.coefficient < 0n;
	},
	["isNeg"],
);
