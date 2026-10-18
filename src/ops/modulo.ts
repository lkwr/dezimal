import { Decimal, type DecimalLike } from "../decimal.ts";
import { truncDivide } from "../utils/division.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns the remainder of this value divided by `other`, carrying the
		 * dividend's sign (JavaScript `%` semantics). Computed exactly.
		 */
		modulo(other: DecimalLike): Decimal;
		mod(other: DecimalLike): Decimal;
	}
}

extend(
	"modulo",
	function modulo(this: Decimal, other: DecimalLike): Decimal {
		const { remainder } = truncDivide(this.raw, parse(other));
		return new Decimal(remainder);
	},
	["mod"],
);
