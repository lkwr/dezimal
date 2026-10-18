import { Decimal } from "../decimal.ts";
import { extendStatic } from "../utils/extend.ts";

declare module "dezimal" {
	interface DecimalConstructor {
		/** Returns whether the value is a Decimal instance. */
		isDecimal(value: unknown): value is import("dezimal").Decimal;
	}
}

extendStatic("isDecimal", function isDecimal(value: unknown): value is Decimal {
	return value instanceof Decimal;
});
