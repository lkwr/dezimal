import { Decimal, type DecimalLike } from "../decimal.ts";
import { addRaw } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezi" {
	interface Decimal {
		plus(other: DecimalLike): Decimal;
		add(other: DecimalLike): Decimal;
	}
}

function plus(this: Decimal, input: DecimalLike): Decimal {
	return new Decimal(addRaw(this.raw, parse(input)));
}

extend("plus", plus, ["add"]);
