import type { Decimal, DecimalLike } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "./compare.ts";

declare module "dezimal" {
	interface Decimal {
		/** Returns true if the value is less than `other`. */
		lessThan(other: DecimalLike): boolean;
		lt(other: DecimalLike): boolean;
	}
}

extend(
	"lessThan",
	function lessThan(this: Decimal, other: DecimalLike): boolean {
		return this.compare(other) < 0;
	},
	["lt"],
);
