import type { RoundingMode } from "dezi";
import { Decimal, type DecimalLike } from "../decimal.ts";
import { normalize, pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

// required extensions
import "../config/precision.ts";
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the square root, rounded to `Decimal.precision` significant
		 * digits using the `Decimal.rounding` mode.
		 */
		sqrt(): Decimal;
	}
}

/**
 * Computes the square root of `value` to `Decimal.precision` significant
 * digits, rounding with `Decimal.rounding`.
 */
const sqrtDecimals = (value: DecimalLike): Decimal => {
	const [c, e] = normalize(parse(value));
	if (c < 0n) {
		throw new RangeError(
			"Invalid Decimal operation: square root of a negative value",
		);
	}
	if (c === 0n) {
		return new Decimal([0n, 0]);
	}

	// Make the exponent even: value = cPrime × 10^ePrime, so sqrt =
	// √cPrime × 10^(ePrime/2).
	let cPrime = c;
	let ePrime = e;
	if (ePrime % 2 !== 0) {
		cPrime *= 10n;
		ePrime -= 1;
	}

	const digitsC = cPrime.toString().length;
	// Floor of log10(√cPrime), from digit counts alone: √cPrime lies in
	// [10^sciExpRoot, 10^(sciExpRoot + 1)).
	const sciExpRoot = Math.floor((digitsC - 1) / 2);

	// Precision is user-mutable without validation until a `set()` extension.
	const precision = Decimal.precision;
	if (precision < 1) {
		throw new RangeError(
			`Invalid Decimal precision: expected a positive integer, got ${precision}`,
		);
	}

	// Q = modeRound(√cPrime × 10^t) with t = precision - 1 - sciExpRoot, so Q
	// lands in [10^(precision-1), 10^precision) and carries `precision`
	// significant digits.
	const t = precision - 1 - sciExpRoot;
	const guard = t < 0 ? -t : 0;
	const shift = t + guard; // ≥ 0

	// Bounded materialization: √W = √cPrime × 10^shift carries the full
	// `precision` significant digits, so W spans ~2·precision digits when
	// t ≥ 0 regardless of the input's exponent, and is cPrime itself (input
	// digit-bounded) when t < 0.
	const W = cPrime * pow10(2 * shift);
	const root = isqrt(W); // floor(√W)
	const remainder = W - root * root; // W - root² ≥ 0

	// 10^guard folds the sub-precision scale back out (1n when guard = 0).
	const scaleOut = pow10(guard);
	const low = root % scaleOut;

	// Half-ulp decision, all-integer: true = root + f, so the fractional part
	// of true = √W/scaleOut is (low + f)/scaleOut, and the f > D/2 and f = D/2
	// tests reduce to 4W vs (2·root + D)², where D = scaleOut - 2·low
	// (D = 1 when guard = 0, since low = 0 then).
	const boundary = 2n * root + (guard === 0 ? 1n : scaleOut - low * 2n);
	const overHalf = 4n * W > boundary ** 2n;
	const atHalf = 4n * W === boundary ** 2n;
	const discarded = remainder > 0n || low > 0n;

	// Results are non-negative here, so ceil matches up, floor matches down,
	// and the half-ceil/half-floor ties resolve away from/towards zero.
	const mode: RoundingMode = Decimal.rounding;
	let q = root / scaleOut;
	let increment: boolean;
	switch (mode) {
		case "up":
			increment = discarded;
			break;
		case "down":
			increment = false;
			break;
		case "ceil":
			increment = discarded;
			break;
		case "floor":
			increment = false;
			break;
		case "half-up":
			increment = overHalf || atHalf;
			break;
		case "half-down":
			increment = overHalf;
			break;
		case "half-even":
			increment = overHalf || (atHalf && (q & 1n) === 1n);
			break;
		case "half-ceil":
			increment = overHalf || atHalf;
			break;
		case "half-floor":
			increment = overHalf;
			break;
	}
	if (increment) {
		q += 1n;
	}

	// Rounding may carry into a fresh power of ten (9.99..9 → 10^k), which
	// normalize() absorbs before the final range guard.
	let coefficient = q;
	let resultExponent = sciExpRoot + ePrime / 2 - precision + 1;
	[coefficient, resultExponent] = normalize([coefficient, resultExponent]);
	if (Math.abs(resultExponent) > Decimal.exponentLimit) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): ${coefficient}e${resultExponent}`,
		);
	}
	return new Decimal([coefficient, resultExponent]);
};

/** Newton iteration for floor(√n), n ≥ 0. */
const isqrt = (n: bigint): bigint => {
	if (n < 2n) {
		return n;
	}
	let x = 1n << BigInt(Math.ceil((n.toString(2).length + 1) / 2));
	let y = (x + n / x) >> 1n;
	while (y < x) {
		x = y;
		y = (x + n / x) >> 1n;
	}
	return x;
};

extend("sqrt", function sqrt(this: Decimal): Decimal {
	return sqrtDecimals(this);
});
