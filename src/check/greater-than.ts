import type { Decimal, DecimalLike } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "./compare.ts";

declare module "dezi" {
	interface Decimal {
		/** Returns true if the value is greater than `other`. */
		greaterThan(other: DecimalLike): boolean;
		gt(other: DecimalLike): boolean;
	}
}

extend(
	"greaterThan",
	function greaterThan(this: Decimal, other: DecimalLike): boolean {
		return this.compare(other) > 0;
	},
	["gt"],
);
