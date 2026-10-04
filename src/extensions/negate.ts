import { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns the value with the opposite sign. */
		negate(): Decimal;
	}
}

extend("negate", function negate(this: Decimal): Decimal {
	return new Decimal([-this.coefficient, this.exponent]);
});
