import { Decimal } from "../decimal.ts";
import { extendStatic } from "../utils/extend.ts";

// This static is intentionally NOT part of the core constructor: it belongs to
// the ln10 extension, and the exponential/logarithmic extensions (exp, ln)
// import this module. Like `Decimal.precision` it is user-mutable without
// validation until a `set()` extension.
declare module "dezi" {
	interface DecimalConstructor {
		/**
		 * The natural logarithm of 10, pinned as a Decimal. Range checks in the
		 * exponential and logarithmic family decide against this value with
		 * exact bigint comparisons; override it like `Decimal.precision` to
		 * raise the pinned digits.
		 */
		ln10: import("dezi").Decimal;
	}
}

extendStatic("ln10", new Decimal([2302585092994045684017991454684n, -30]));
