import { Decimal, type DecimalLike } from "../decimal.ts";
import { extendStatic } from "../utils/extend.ts";

// required extensions
import "../ops/plus.ts";
import "../ops/sqrt.ts";
import "../ops/times.ts";

declare module "dezi" {
	interface DecimalConstructor {
		/**
		 * Returns the square root of the sum of the squares of the given
		 * values, rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode.
		 */
		hypot(...values: DecimalLike[]): Decimal;
	}
}

extendStatic("hypot", function hypot(...values: DecimalLike[]): Decimal {
	return values
		.reduce<Decimal>(
			(total, value) => total.plus(new Decimal(value).times(value)),
			new Decimal(0),
		)
		.sqrt();
});
