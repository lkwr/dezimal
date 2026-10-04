import type { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns true if the value is positive. Zero is not positive. */
		isPositive(): boolean;
		/** Returns true if the value is positive. Zero is not positive. */
		isPos(): boolean;
	}
}

extend(
	"isPositive",
	function isPositive(this: Decimal): boolean {
		return this.coefficient > 0n;
	},
	["isPos"],
);
