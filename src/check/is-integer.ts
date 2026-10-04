import type { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns true if the value is a whole number. */
		isInteger(): boolean;
		/** Returns true if the value is a whole number. */
		isInt(): boolean;
	}
}

extend(
	"isInteger",
	function isInteger(this: Decimal): boolean {
		return this.exponent >= 0;
	},
	["isInt"],
);
