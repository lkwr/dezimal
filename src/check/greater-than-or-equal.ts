import type { Decimal, DecimalLike } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "./compare.ts";

declare module "dezimal" {
	interface Decimal {
		/** Returns true if the value is greater than or equal to `other`. */
		greaterThanOrEqual(other: DecimalLike): boolean;
		/** Returns true if the value is greater than or equal to `other`. */
		gte(other: DecimalLike): boolean;
	}
}

extend(
	"greaterThanOrEqual",
	function greaterThanOrEqual(this: Decimal, other: DecimalLike): boolean {
		return this.compare(other) >= 0;
	},
	["gte"],
);
