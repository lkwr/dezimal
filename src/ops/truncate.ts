import { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns the integer part of the value, truncated towards zero. */
		truncate(): Decimal;
		trunc(): Decimal;
	}
}

extend(
	"truncate",
	function truncate(this: Decimal): Decimal {
		return new Decimal(roundToScale(this.raw, 0, "down"));
	},
	["trunc"],
);
