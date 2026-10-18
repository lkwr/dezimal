import type { Decimal, DecimalLike } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "./compare.ts";

declare module "dezimal" {
	interface Decimal {
		/** Returns true if the value is less than or equal to `other`. */
		lessThanOrEqual(other: DecimalLike): boolean;
		/** Returns true if the value is less than or equal to `other`. */
		lte(other: DecimalLike): boolean;
	}
}

extend(
	"lessThanOrEqual",
	function lessThanOrEqual(this: Decimal, other: DecimalLike): boolean {
		return this.compare(other) <= 0;
	},
	["lte"],
);
