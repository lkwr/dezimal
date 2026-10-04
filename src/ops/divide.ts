import type { RoundingMode } from "dezi";
import { Decimal, type DecimalLike } from "../decimal.ts";
import { abs, normalize, pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

// required extensions
import "../config/precision.ts";
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns this value divided by the other, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode.
		 */
		divide(other: DecimalLike): Decimal;
		/**
		 * Returns this value divided by the other, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode.
		 */
		div(other: DecimalLike): Decimal;
	}
}

/**
 * Long-divides `self` by `other` to `Decimal.precision` significant digits,
 * rounding with `Decimal.rounding`.
 */
const divideDecimals = (self: DecimalLike, other: DecimalLike): Decimal => {
	const divisor = normalize(parse(other));
	if (divisor[0] === 0n) {
		throw new RangeError("Invalid Decimal operation: division by zero");
	}

	const dividend = normalize(parse(self));
	if (dividend[0] === 0n) {
		return new Decimal([0n, 0]);
	}

	const [a, ea] = dividend;
	const [b, eb] = divisor;
	const sign = a < 0n !== b < 0n ? -1n : 1n;
	const A = abs(a);
	const B = abs(b);

	// v = (A * 10^ea) / (B * 10^eb) is bracketed by the coefficient digit
	// counts: v lies in (10^(exponent-1), 10^(exponent+1)), and only the lower
	// edge can ever need adjusting, so one comparison pins v into
	// [10^exponent, 10^(exponent+1)).
	const dA = A.toString().length;
	const dB = B.toString().length;
	let exponent = ea - eb + dA - dB;
	if (dA >= dB) {
		if (A < B * pow10(dA - dB)) exponent -= 1;
	} else if (A * pow10(dB - dA) < B) {
		exponent -= 1;
	}

	// Precision is user-mutable without validation until a `set()` extension.
	const digits = Decimal.precision;
	if (digits < 1) {
		throw new RangeError(
			`Invalid Decimal precision: expected a positive integer, got ${digits}`,
		);
	}

	// Rescale v to the integer range [10^(digits-1), 10^digits): shift folds
	// the decimal exponents into the applied power of ten (exponent already
	// carries ea - eb), so it only tracks the coefficient digit counts and the
	// intermediate materialization stays far below ~2M digits even with
	// exponents at the ±999999 limit.
	const shift = digits - 1 - exponent + (ea - eb);
	let numerator: bigint;
	let denominator: bigint;
	if (shift >= 0) {
		numerator = A * pow10(shift);
		denominator = B;
	} else {
		numerator = A;
		denominator = B * pow10(-shift);
	}
	let quotient = numerator / denominator;
	const remainder = numerator % denominator;

	// BigInt division truncated the ideal quotient; the discarded part (halfway
	// = remainder * 2 vs denominator) drives the configured rounding mode, and
	// "positive"/"negative" refer to the result coefficient's sign.
	const mode: RoundingMode = Decimal.rounding;
	const discarded = remainder > 0n;
	const overHalf = remainder * 2n > denominator;
	const atHalf = remainder * 2n === denominator;
	const positive = sign > 0n;
	const negative = sign < 0n;

	let increment: boolean;
	switch (mode) {
		case "up":
			increment = discarded;
			break;
		case "down":
			increment = false;
			break;
		case "ceil":
			increment = discarded && positive;
			break;
		case "floor":
			increment = discarded && negative;
			break;
		case "half-up":
			increment = overHalf || atHalf;
			break;
		case "half-down":
			increment = overHalf;
			break;
		case "half-even":
			increment = overHalf || (atHalf && (quotient & 1n) === 1n);
			break;
		case "half-ceil":
			increment = overHalf || (atHalf && positive);
			break;
		case "half-floor":
			increment = overHalf || (atHalf && negative);
			break;
	}
	if (increment) quotient += 1n;

	// Rounding may carry into a fresh power of ten (9.99..9 -> 1000..0), which
	// normalize() absorbs before the final range guard.
	let coefficient = sign * quotient;
	let resultExponent = exponent - digits + 1;
	[coefficient, resultExponent] = normalize([coefficient, resultExponent]);
	if (Math.abs(resultExponent) > Decimal.exponentLimit) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): ${coefficient}e${resultExponent}`,
		);
	}
	return new Decimal([coefficient, resultExponent]);
};

extend(
	"divide",
	function divide(this: Decimal, other: DecimalLike): Decimal {
		return divideDecimals(this, other);
	},
	["div"],
);
