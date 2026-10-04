import { Decimal, type DecimalLike } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "../check/compare.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns this value clamped to the interval between `min` and `max`;
		 * returns `this` when the value is in range.
		 */
		clamp(min: DecimalLike, max: DecimalLike): Decimal;
	}
}

extend(
	"clamp",
	function clamp(this: Decimal, min: DecimalLike, max: DecimalLike): Decimal {
		const lower = new Decimal(min);
		const upper = new Decimal(max);
		if (lower.compare(upper) > 0)
			throw new RangeError("Invalid Decimal clamp: min exceeds max");
		if (this.compare(lower) < 0) return lower;
		if (this.compare(upper) > 0) return upper;
		return this;
	},
);
