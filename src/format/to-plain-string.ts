import type { Decimal } from "../decimal.ts";
import { abs } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";

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
	function toPlainString(this: Decimal, fractionDigits = 0): string {
		const sign = this.coefficient < 0n ? "-" : "";
		const digits = abs(this.coefficient).toString();
		const pointIndex = digits.length + this.exponent;

		let integerPart: string;
		let fractionPart: string;
		if (this.exponent >= 0) {
			integerPart = digits + "0".repeat(this.exponent);
			fractionPart = "";
		} else if (pointIndex > 0) {
			integerPart = digits.slice(0, pointIndex);
			fractionPart = digits.slice(pointIndex);
		} else {
			integerPart = "0";
			fractionPart = "0".repeat(-pointIndex) + digits;
		}

		fractionPart = fractionPart.padEnd(fractionDigits, "0");
		return fractionPart
			? `${sign}${integerPart}.${fractionPart}`
			: `${sign}${integerPart}`;
	},
);
