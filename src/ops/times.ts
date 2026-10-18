import { Decimal, type DecimalLike } from "../decimal.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezimal" {
	interface Decimal {
		times(other: DecimalLike): Decimal;
		mul(other: DecimalLike): Decimal;
		multiply(other: DecimalLike): Decimal;
	}
}

extend(
	"times",
	function times(this: Decimal, input: DecimalLike): Decimal {
		const other = parse(input);
		return new Decimal([this.coefficient * other[0], this.exponent + other[1]]);
	},
	["mul", "multiply"],
);
