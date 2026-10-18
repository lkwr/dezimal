import type { Decimal } from "../decimal.ts";
import { abs } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { plainString } from "../utils/string.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the exact value in plain (non-exponential) notation. With
		 * `fractionDigits`, the fraction is padded with zeros to at least that
		 * many digits; the value itself is never rounded.
		 */
		toPlainString(fractionDigits?: number): string;
	}
}

extend(
	"toPlainString",
	function toPlainString(this: Decimal, fractionDigits?: number): string {
		return plainString(
			this.coefficient < 0n ? "-" : "",
			abs(this.coefficient).toString(),
			this.exponent,
			fractionDigits,
		);
	},
);
