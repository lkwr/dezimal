import { Decimal } from "../decimal.ts";
import { abs } from "../utils/common.ts";
import { extend, extendStatic } from "../utils/extend.ts";
import { exponentialString, plainString } from "../utils/string.ts";

// Notation thresholds are owned by this extension: only formatting needs to
// decide between plain and exponential output.
declare module "dezimal" {
	interface DecimalConstructor {
		/** Exponents bigger than this are formatted exponentially ("1e+21"). */
		maxPlainExponent: number;
		/** Exponents smaller-or-equal to this are formatted exponentially. */
		minPlainExponent: number;
	}

	interface Decimal {
		toString(): string;
	}
}

extendStatic("maxPlainExponent", 20);
extendStatic("minPlainExponent", -7);

extend("toString", function (this: Decimal): string {
	const sign = this.coefficient < 0n ? "-" : "";
	const digits = abs(this.coefficient).toString();
	// Power of ten of the leading digit, e.g. for 123.4 (digits "1234", exponent -1) -> 2.
	const leadingPower = digits.length + this.exponent - 1;
	return leadingPower > Decimal.maxPlainExponent ||
		leadingPower <= Decimal.minPlainExponent
		? exponentialString(sign, digits, leadingPower)
		: plainString(sign, digits, this.exponent);
});
