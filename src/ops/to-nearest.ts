import type { RoundingMode } from "dezi";
import { Decimal, type DecimalLike } from "../decimal.ts";
import { abs, normalize, pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";
import { roundingIncrement } from "../utils/rounding.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the nearest multiple of the given base, rounding `value / base`
		 * to an integer with the given mode (default: the `Decimal.rounding`
		 * mode). Exact: never rounds to `Decimal.precision` digits.
		 */
		toNearest(base: DecimalLike, mode?: RoundingMode): Decimal;
	}
}

/**
 * Returns k × base, where k is the integer obtained by rounding the exact
 * rational value/base with `mode`. The quotient keeps its full numerator and
 * denominator until the final product, so no `Decimal.precision` digits are
 * involved anywhere.
 */
const toNearestDecimals = (
	self: DecimalLike,
	base: DecimalLike,
	mode?: RoundingMode,
): Decimal => {
	const divisor = normalize(parse(base));
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

	// Align the exact rational value/base onto integer operands the way
	// divide.ts does, so a single BigInt division yields the integer part of
	// the quotient plus its exact discarded fraction.
	let numerator: bigint;
	let denominator: bigint;
	if (ea >= eb) {
		numerator = abs(a) * pow10(ea - eb);
		denominator = abs(b);
	} else {
		numerator = abs(a);
		denominator = abs(b) * pow10(eb - ea);
	}
	let quotient = numerator / denominator; // BigInt division truncates towards zero
	const remainder = numerator % denominator;

	const discarded = remainder > 0n;
	const overHalf = remainder * 2n > denominator;
	const atHalf = remainder * 2n === denominator;
	// The mode switch's positive/negative describe the sign of the quotient k,
	// not of the value: k is negative exactly when value and base differ in
	// sign, so "ceil" increments for k > 0 and "floor" for k < 0.
	const positive = sign > 0n;
	const negative = sign < 0n;

	if (
		roundingIncrement(mode ?? Decimal.rounding, {
			discarded,
			overHalf,
			atHalf,
			isOdd: (quotient & 1n) === 1n,
			positive,
			negative,
		})
	) {
		quotient += 1n;
	}

	// The result is the exact product k × base: normalize() only strips
	// trailing zeros before the final exponent field guard.
	let coefficient = sign * quotient * b;
	let resultExponent = eb;
	[coefficient, resultExponent] = normalize([coefficient, resultExponent]);
	if (Math.abs(resultExponent) > Decimal.exponentLimit) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): ${coefficient}e${resultExponent}`,
		);
	}
	return new Decimal([coefficient, resultExponent]);
};

extend(
	"toNearest",
	function toNearest(
		this: Decimal,
		base: DecimalLike,
		mode?: RoundingMode,
	): Decimal {
		return toNearestDecimals(this, base, mode);
	},
);
