import { Decimal, type DecimalLike } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required ops
import "./plus.ts";
import "./negate.ts";

declare module "dezi" {
	interface Decimal {
		minus(other: DecimalLike): Decimal;
		sub(other: DecimalLike): Decimal;
		subtract(other: DecimalLike): Decimal;
	}
}

extend(
	"minus",
	function minus(this: Decimal, input: DecimalLike): Decimal {
		return this.add(new Decimal(input).negate());
	},
	["sub", "subtract"],
);
