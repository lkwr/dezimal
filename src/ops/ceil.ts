import { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";
import { roundToScale } from "../utils/rounding.ts";

declare module "dezimal" {
	interface Decimal {
		/** Returns the smallest integer greater than or equal to this value. */
		ceil(): Decimal;
	}
}

extend("ceil", function ceil(this: Decimal): Decimal {
	return new Decimal(roundToScale(this.raw, 0, "ceil"));
});
