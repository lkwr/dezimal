import type { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "./to-string.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the value as a primitive number. This conversion loses
		 * precision for values beyond Number's 64-bit float range; values
		 * beyond ~1e308 convert to ±Infinity and values below ~1e-308 to 0.
		 */
		toNumber(): number;
	}
}

extend("toNumber", function (this: Decimal) {
	return Number(this.toString());
});
