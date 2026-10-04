import type { Decimal } from "../decimal.ts";
import { abs } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";

declare module "dezi" {
	interface Decimal {
		toPlainString(fractionDigits?: number): string;
	}
}

extend("toPlainString", function (this: Decimal, fractionDigits?: number) {
	if (this.coefficient === 0n) {
		return fractionDigits !== undefined && fractionDigits > 0
			? `0.${"0".repeat(fractionDigits)}`
			: "0";
	}
	const sign = this.coefficient < 0n ? "-" : "";
	const digits = abs(this.coefficient).toString();
	const pointIndex = digits.length + this.exponent;
	let integerPart: string;
	let fractionPart: string;
	if (this.exponent >= 0) {
		integerPart = `${digits}${"0".repeat(this.exponent)}`;
		fractionPart = "";
	} else if (pointIndex > 0) {
		integerPart = digits.slice(0, pointIndex);
		fractionPart = digits.slice(pointIndex);
	} else {
		integerPart = "0";
		fractionPart = `${"0".repeat(-pointIndex)}${digits}`;
	}
	if (fractionDigits === undefined) {
		return fractionPart
			? `${sign}${integerPart}.${fractionPart}`
			: `${sign}${integerPart}`;
	}
	if (fractionDigits <= 0) {
		return `${sign}${integerPart}`;
	}
	// The value is already rounded to this granularity, so only padding is needed.
	const fraction = fractionPart.padEnd(fractionDigits, "0");
	return `${sign}${integerPart}.${fraction}`;
});
