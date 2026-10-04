import { Decimal, type DecimalLike } from "../decimal.ts";
import { pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezi" {
	interface Decimal {
		plus(other: DecimalLike): Decimal;
		add(other: DecimalLike): Decimal;
	}
}

function plus(this: Decimal, input: DecimalLike): Decimal {
	const other = parse(input);
	const exponent = Math.min(this.exponent, other[1]);
	const alignedSelf = this.coefficient * pow10(this.exponent - exponent);
	const alignedOther = other[0] * pow10(other[1] - exponent);
	return new Decimal([alignedSelf + alignedOther, exponent]);
}

extend("plus", plus, ["add"]);
