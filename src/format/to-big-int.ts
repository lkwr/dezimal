import type { Decimal } from "../decimal.ts";
import { pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns the value as a bigint. Throws a RangeError for values with a
		 * fractional part; round them first, e.g. `value.truncate().toBigInt()`.
		 */
		toBigInt(): bigint;
	}
}

extend("toBigInt", function toBigInt(this: Decimal): bigint {
	if (this.exponent < 0) {
		throw new RangeError(
			"Invalid Decimal operation: toBigInt of a non-integer value",
		);
	}
	return this.coefficient * pow10(this.exponent);
});
