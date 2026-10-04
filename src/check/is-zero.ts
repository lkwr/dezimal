import type { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns true if the value is zero. */
		isZero(): boolean;
	}
}

extend("isZero", function isZero(this: Decimal): boolean {
	return this.coefficient === 0n;
});
