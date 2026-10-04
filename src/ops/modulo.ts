import { Decimal, type DecimalLike } from "../decimal.ts";
import { normalize } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { truncDivide } from "../utils/integer-division.ts";
import { parse } from "../utils/parse.ts";

declare module "dezi" {
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
		const { remainder } = truncDivide(
			normalize(parse(this)),
			normalize(parse(other)),
		);
		return new Decimal(remainder);
	},
	["mod"],
);
