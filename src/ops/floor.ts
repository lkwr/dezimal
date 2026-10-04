import { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns the largest integer less than or equal to this value. */
		floor(): Decimal;
	}
}

extend("floor", function floor(this: Decimal): Decimal {
	return new Decimal(
		roundToScale([this.coefficient, this.exponent], 0, "floor"),
	);
});
