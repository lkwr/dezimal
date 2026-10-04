import { Decimal, type DecimalLike, type RawDecimal } from "../decimal.ts";
import { abs, digitsOf, LOG10_2, normalize, pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { isqrt } from "../utils/integer-roots.ts";
import { parse } from "../utils/parse.ts";
import { roundingIncrement } from "../utils/rounding.ts";

// required extensions
import "../config/ln10.ts";
import "../config/precision.ts";
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the natural logarithm, rounded to `Decimal.precision`
		 * significant digits using the `Decimal.rounding` mode.
		 */
		ln(): Decimal;
	}
}

/**
 * Computes the natural logarithm of `value` to `Decimal.precision`
 * significant digits, rounding with `Decimal.rounding`.
 *
 * Reduces the receiver by repeated square roots — each one halves the
 * logarithm — until t = (v − 1)/(v + 1) is small, reconstructs
 * ln(v_reduced) from the inverse hyperbolic tangent series 2·(t + t³/3 +
 * t⁵/5 + …), and undoes the reduction with one exact multiplication by 2^k.
 * Everything past the input parse happens at a working precision above
 * `Decimal.precision`, so results are correctly rounded like other
 * precision-based operations.
 */
const lnDecimals = (value: DecimalLike): Decimal => {
	const [c, e] = normalize(parse(value));
	if (c <= 0n) {
		throw new RangeError(
			"Invalid Decimal operation: natural logarithm of a non-positive value",
		);
	}
	if (c === 1n && e === 0) {
		return new Decimal([0n, 0]);
	}

	// Precision is user-mutable without validation until a `set()` extension.
	const precision = Decimal.precision;
	if (precision < 1) {
		throw new RangeError(
			`Invalid Decimal precision: expected a positive integer, got ${precision}`,
		);
	}

	// Size the reduction budget from the input alone: |ln v| ≤
	// (|decimalExponent| + 1)·ln 10 holds by digit counts, and the loop stops
	// once |ln v_reduced| ≤ 2·atanh(1e-4) ≈ 2e-4, so at most
	// ceil(log2(|ln v|/2e-4)) reductions can run. ln 10 is read from the
	// overridable config static (like `Decimal.precision`); only a float
	// estimate scaled by 10^4 is needed here, and the +2 covers the stop
	// overshoot and log error.
	const ln10 = Number(Decimal.ln10.coefficient) * 10 ** Decimal.ln10.exponent;
	const valueDigits = digitsOf(c);
	const decimalExponent = e + valueDigits - 1;
	const reductionMax =
		Math.ceil(Math.log2((Math.abs(decimalExponent) + 1) * ln10 * 10_000)) + 2;

	// Working precision. The expansion ln(v) = 2^k·ln(v_reduced) is an exact
	// bigint multiply, so the guard only needs to keep the reduction digits
	// ahead of ln(v)'s own last-place digit: ceil(kMax·log10 2) budgets the
	// reduction count itself, and +10 covers the sqrt chain's bounded ~2
	// half-ulp drift (each step halves the accumulated error, since values
	// within the threshold are never reduced) plus series truncation.
	const guard = Math.ceil(reductionMax * LOG10_2) + 10;
	const working = precision + guard;

	let currentCoefficient = c;
	let currentExponent = e;
	let reductions = 0;

	// t = (v − 1)/(v + 1) at working scale, full-width (unnormalized) so the
	// series grid below keeps every computed digit.
	let tCoefficient = 0n;
	let tExponent = 0;

	for (;;) {
		const currentDecimalExponent =
			currentExponent + digitsOf(currentCoefficient) - 1;
		if (currentDecimalExponent < -4 || currentDecimalExponent > 0) {
			// v is far from 1, so |(v − 1)/(v + 1)| > 0.8 either way: reduce.
			[currentCoefficient, currentExponent] = sqrtRaw(
				[currentCoefficient, currentExponent],
				working,
			);
			reductions += 1;
			continue;
		}
		// Near 1 the exponent is non-positive, so v ± 1 aligns on a power of
		// ten no larger than the coefficient itself and both stay exact.
		const unit = currentExponent === 0 ? 1n : pow10(-currentExponent);
		const numerator = currentCoefficient - unit;
		if (numerator === 0n) {
			// v is exactly 1. Unreachable inside the loop (values within the
			// threshold are never reduced, and a rounded sqrt cannot produce
			// an exact 1); kept so the sum below degrades gracefully to zero.
			break;
		}
		[tCoefficient, tExponent] = divScaledRaw(
			numerator,
			currentCoefficient + unit,
			working + 2,
		);
		const tDigits = digitsOf(tCoefficient);
		const tPosition = tExponent + tDigits - 1;
		// Stop once |t| ≤ 1e-4. Below the −4 position that holds strictly;
		// at exactly −4 only the minimal core 10^(tDigits − 1), i.e.
		// |t| = 1e-4 exactly, still qualifies (larger cores round above it).
		// The quadratic correction t²/3 stays ≤ 3.4e-9 of the leading term,
		// and every series term shrinks by a factor ≥ 1e-8, so the sum needs
		// only ~working/8 terms before vanishing on the working grid.
		if (
			tPosition < -4 ||
			(tPosition === -4 &&
				(tCoefficient === pow10(tDigits - 1) ||
					tCoefficient === -pow10(tDigits - 1)))
		) {
			break;
		}
		[currentCoefficient, currentExponent] = sqrtRaw(
			[currentCoefficient, currentExponent],
			working,
		);
		reductions += 1;
	}

	if (tCoefficient === 0n) {
		return new Decimal([0n, 0]);
	}

	// ln(v_reduced) = 2·atanh(t) = 2·(t + t³/3 + t⁵/5 + …), summed on the
	// fixed grid 10^tGrid one position below t's scale, where the leading
	// term 2t is exactly 20·tCoefficient and each later term derives from the
	// previous one by multiplying with t² — scaled bigints with numerically
	// tracked exponents, so no huge power of ten is ever materialized. For
	// tiny t the quadratic correction t²/3 falls entirely below the final
	// rounding grid and the single leading term is already exact.
	const tGrid = tExponent - 1;
	let sum = 20n * tCoefficient;
	const tDigits = digitsOf(tCoefficient);
	const tPosition = tExponent + tDigits - 1;
	if (2 * tPosition > -(working + 4)) {
		const tSquared = tCoefficient * tCoefficient;
		// |t| ≥ ~10^(-(working + 4)/2) here, so the per-step divisor
		// 10^(-2·tExponent) stays at ~3·working digits.
		const stepScale = pow10(-2 * tExponent);
		let term = sum;
		for (let j = 1; term !== 0n; j += 1) {
			term =
				(term * tSquared * BigInt(2 * j - 1)) / (BigInt(2 * j + 1) * stepScale);
			sum += term;
		}
	}

	// Undo the reduction exactly: ln(v) = 2^k·ln(v_reduced), a pure bigint
	// shift on the scaled coefficient. |ln(v)| = 2^k·|ln(v_reduced)| grows
	// the value and its last-place digit together, so the relative accuracy
	// of the working result survives the expansion.
	const negative = sum < 0n;
	const scaled = (negative ? -sum : sum) << BigInt(reductions);
	const scaledDigits = digitsOf(scaled);
	const targetExponent = scaledDigits + tGrid - precision;

	// Round to `precision` significant digits with the configured mode; the
	// discarded remainder drives all nine modes exactly as in division.
	const den = pow10(scaledDigits - precision);
	let quotient = scaled / den;
	const remainder = scaled % den;
	const discarded = remainder > 0n;
	const overHalf = remainder * 2n > den;
	const atHalf = remainder * 2n === den;

	if (
		roundingIncrement(Decimal.rounding, {
			discarded,
			overHalf,
			atHalf,
			isOdd: (quotient & 1n) === 1n,
			positive: !negative,
			negative,
		})
	) {
		quotient += 1n;
	}

	// Rounding may carry into a fresh power of ten (9.99..9 → 10^k), which
	// normalize() absorbs before the final range guard.
	let resultCoefficient = negative ? -quotient : quotient;
	let resultExponent = targetExponent;
	[resultCoefficient, resultExponent] = normalize([
		resultCoefficient,
		resultExponent,
	]);
	if (Math.abs(resultExponent) > Decimal.exponentLimit) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): ${resultCoefficient}e${resultExponent}`,
		);
	}
	return new Decimal([resultCoefficient, resultExponent]);
};

/**
 * Square root of a normalized positive RawDecimal, rounded to `digits`
 * significant digits. File-local reduction primitive: the public `sqrt()`
 * rounds at `Decimal.precision` and would destroy the accuracy the
 * logarithm needs before its own final rounding. Same half-ulp machinery as
 * the public sqrt, generalized to an arbitrary digit count, and always
 * rounding to nearest so the error budget stays mode-independent.
 */
const sqrtRaw = (value: RawDecimal, digits: number): RawDecimal => {
	const [c, e] = value; // normalized, positive
	if (c === 0n) {
		return [0n, 0];
	}

	// Make the exponent even: value = cPrime × 10^ePrime, so sqrt =
	// √cPrime × 10^(ePrime/2).
	let cPrime = c;
	let ePrime = e;
	if (ePrime % 2 !== 0) {
		cPrime *= 10n;
		ePrime -= 1;
	}

	const digitsC = digitsOf(cPrime);
	// Floor of log10(√cPrime), from digit counts alone: √cPrime lies in
	// [10^rootExponent, 10^(rootExponent + 1)).
	const rootExponent = Math.floor((digitsC - 1) / 2);

	// Q rounds √cPrime × 10^t with t = digits − 1 − rootExponent, so Q lands
	// in [10^(digits−1), 10^digits) and carries `digits` significant digits.
	const t = digits - 1 - rootExponent;
	const guard = t < 0 ? -t : 0;
	const shift = t + guard; // ≥ 0

	// Bounded materialization: W spans ~2·digits digits when t ≥ 0 regardless
	// of the input's exponent, and is cPrime itself (input digit-bounded)
	// when t < 0.
	const W = cPrime * pow10(2 * shift);
	const root = isqrt(W);

	// 10^guard folds the sub-`digits` scale back out (1n when guard = 0).
	const scaleOut = pow10(guard);
	const low = root % scaleOut;

	// Half-ulp decision, all-integer: true = root + f, so the fractional part
	// of true/10^guard is (low + f)/10^guard, and the f > D/2 and f = D/2
	// tests reduce to 4W vs (2·root + D)², where D = scaleOut − 2·low
	// (D = 1 when guard = 0, since low = 0 then).
	const boundary = 2n * root + (guard === 0 ? 1n : scaleOut - low * 2n);
	const overHalf = 4n * W > boundary ** 2n;
	const atHalf = 4n * W === boundary ** 2n;

	// Results are positive, so nearest-half-up is unambiguous.
	let q = root / scaleOut;
	if (overHalf || atHalf) {
		q += 1n;
	}

	// normalize() absorbs a rounding carry such as 9.99..9 → 10^k.
	return normalize([q, rootExponent + ePrime / 2 - digits + 1]);
};

/**
 * Quotient numerator/denominator rounded to `digits` significant digits,
 * returned full-width (no trailing-zero normalization) so the caller keeps
 * the exact working grid. Same exponent bracketing as division, always
 * rounding to nearest for determinism.
 */
const divScaledRaw = (
	numerator: bigint,
	denominator: bigint,
	digits: number,
): RawDecimal => {
	const negative = numerator < 0n !== denominator < 0n;
	const A = abs(numerator);
	const B = abs(denominator);

	// numerator/denominator is bracketed by the digit counts: it lies in
	// (10^(exponent−1), 10^(exponent+1)), and only the lower edge can ever
	// need adjusting, so one comparison pins it into
	// [10^exponent, 10^(exponent+1)).
	const digitsA = digitsOf(A);
	const digitsB = digitsOf(B);
	let exponent = digitsA - digitsB;
	if (digitsA >= digitsB) {
		if (A < B * pow10(digitsA - digitsB)) exponent -= 1;
	} else if (A * pow10(digitsB - digitsA) < B) {
		exponent -= 1;
	}

	// Rescale to the integer range [10^(digits−1), 10^digits): shift folds
	// the exponents into the applied power of ten, so intermediates stay at
	// ~digits + input digits.
	const shift = digits - 1 - exponent;
	let scaledNumerator: bigint;
	let scaledDenominator: bigint;
	if (shift >= 0) {
		scaledNumerator = A * pow10(shift);
		scaledDenominator = B;
	} else {
		scaledNumerator = A;
		scaledDenominator = B * pow10(-shift);
	}
	let quotient = scaledNumerator / scaledDenominator;
	const remainder = scaledNumerator % scaledDenominator;

	// Nearest, ties up (magnitude rounding, matching the deterministic error
	// budget of the internal steps).
	if (remainder * 2n >= scaledDenominator) {
		quotient += 1n;
	}

	return [negative ? -quotient : quotient, exponent - digits + 1];
};

extend("ln", function ln(this: Decimal): Decimal {
	return lnDecimals(this);
});
