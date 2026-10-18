import { Decimal } from "../decimal.ts";
import { digitsOf, LOG10_2, pow10 } from "../utils/common.ts";
import { divideToPrecision } from "../utils/division.ts";
import { extend } from "../utils/extend.ts";
import { rootToPrecision } from "../utils/integer-roots.ts";
import { currentPrecision } from "../utils/precision.ts";
import { roundToPrecision } from "../utils/rounding.ts";

// required extensions
import "../config/ln10.ts";
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
const lnDecimal = (value: Decimal): Decimal => {
	const { coefficient: c, exponent: e } = value;
	if (c <= 0n) {
		throw new RangeError(
			"Invalid Decimal operation: natural logarithm of a non-positive value",
		);
	}
	if (c === 1n && e === 0) {
		return new Decimal(0n);
	}

	const precision = currentPrecision();

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
			[currentCoefficient, currentExponent] = rootToPrecision(
				[currentCoefficient, currentExponent],
				2,
				working,
				"half-up",
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
		[tCoefficient, tExponent] = divideToPrecision(
			[numerator, 0],
			[currentCoefficient + unit, 0],
			working + 2,
			"half-up",
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
		[currentCoefficient, currentExponent] = rootToPrecision(
			[currentCoefficient, currentExponent],
			2,
			working,
			"half-up",
		);
		reductions += 1;
	}

	if (tCoefficient === 0n) {
		return new Decimal(0n);
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
	const scaled = sum << BigInt(reductions);
	return new Decimal(
		roundToPrecision([scaled, tGrid], precision, Decimal.rounding),
	);
};

extend("ln", function ln(this: Decimal): Decimal {
	return lnDecimal(this);
});
