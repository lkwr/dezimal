import { Decimal } from "../decimal.ts";
import { abs } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns the value with any sign removed. */
		abs(): Decimal;
		absolute(): Decimal;
	}
}

extend(
	"absolute",
	function absolute(this: Decimal): Decimal {
		return new Decimal([abs(this.coefficient), this.exponent]);
	},
	["abs"],
);
