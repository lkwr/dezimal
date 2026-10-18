import { Decimal, type DecimalLike } from "../decimal.ts";
import { addRaw } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezimal" {
	interface Decimal {
		minus(other: DecimalLike): Decimal;
		sub(other: DecimalLike): Decimal;
		subtract(other: DecimalLike): Decimal;
	}
}

extend(
	"minus",
	function minus(this: Decimal, input: DecimalLike): Decimal {
		const [coefficient, exponent] = parse(input);
		return new Decimal(addRaw(this.raw, [-coefficient, exponent]));
	},
	["sub", "subtract"],
);
