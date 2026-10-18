import type { Decimal, DecimalLike } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "./compare.ts";

declare module "dezimal" {
	interface Decimal {
		/** Returns true if the value equals `other`. */
		equals(other: DecimalLike): boolean;
		/** Returns true if the value equals `other`. */
		eq(other: DecimalLike): boolean;
	}
}

extend(
	"equals",
	function equals(this: Decimal, other: DecimalLike): boolean {
		return this.compare(other) === 0;
	},
	["eq"],
);
