import { Decimal, type DecimalLike, type RawDecimal } from "../decimal.ts";
import { abs, digitsOf, pow10 } from "../utils/common.ts";
import { divideToPrecision } from "../utils/division.ts";
import { expToPrecision } from "../utils/exponential.ts";
import { extend } from "../utils/extend.ts";
import { lnToPrecision } from "../utils/logarithm.ts";
import { exponentRangeError, parse } from "../utils/parse.ts";
import { currentPrecision } from "../utils/precision.ts";
import { roundApproximation, roundToPrecision } from "../utils/rounding.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns this value raised to the given exponent.
		 *
		 * Integer exponents within the safe-integer range are computed by
		 * exponentiation by squaring, with intermediates kept to
		 * `Decimal.precision + 8` significant digits, and rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode. Any other exponent is computed as exp(exponent · ln(value))
		 * and rounded to `Decimal.precision` significant digits.
		 *
		 * Throws a RangeError when zero is raised to a negative power, when a
		 * negative base meets a non-integer exponent, or when the result
		 * leaves the `Decimal.exponentLimit` range.
		 */
		pow(exponent: DecimalLike): Decimal;
		/**
		 * Returns this value raised to the given exponent.
		 *
		 * Integer exponents within the safe-integer range are computed by
		 * exponentiation by squaring, with intermediates kept to
		 * `Decimal.precision + 8` significant digits, and rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode. Any other exponent is computed as exp(exponent · ln(value))
		 * and rounded to `Decimal.precision` significant digits.
		 *
		 * Throws a RangeError when zero is raised to a negative power, when a
		 * negative base meets a non-integer exponent, or when the result
		 * leaves the `Decimal.exponentLimit` range.
		 */
		power(exponent: DecimalLike): Decimal;
	}
}

/** Digits beyond the target precision carried through ln and exp. */
const POW_GUARD = 10;

// Positive-integer exponents beyond this bound fall through to the logarithm
// chain; below it, the exact squaring loop stays cheap (≤ 53 iterations).
const MAX_SAFE_EXPONENT = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * One multiplication of two signed pairs in the squaring loop, rounded to
 * `keep` significant digits (nearest, ties away from zero). Throws the
 * exponent range error once the product is certainly out of range.
 */
const multiplyStep = (
	a: RawDecimal,
	b: RawDecimal,
	keep: number,
): RawDecimal => {
	const [coefficient, exponent] = roundToPrecision(
		[a[0] * b[0], a[1] + b[1]],
		keep,
		"half-up",
	);

	// This guard can only ever fire on a certainly-out-of-range product: every
	// stored pair is truncated to at most precision + 8 digits, so its
	// exponent field trails its decade by at most precision + 7 digits, and
	// the decade only ever moves further out in one direction — a base of
	// magnitude ≥ 1 grows it upwards, a base below 1 downwards — so a decade
	// beyond the limit plus this slack can never come back representable in
	// the remaining steps.
	const decade = exponent + digitsOf(coefficient) - 1;
	const bound = Decimal.exponentLimit + Decimal.precision + 64;
	if (Math.abs(decade) > bound) {
		throw exponentRangeError(decade);
	}
	return [coefficient, exponent];
};

/**
 * Exact exponentiation by squaring for a safe-integer exponent. Products are
 * truncated at precision + 8 significant digits, which bounds the accumulated
 * relative error far below one ulp of the final `Decimal.precision` rounding;
 * the final value is then rounded to `Decimal.precision` significant digits
 * with the configured mode. A negative exponent takes the reciprocal, which is
 * exact when it terminates on the precision grid, precision-rounded otherwise.
 */
const integerPower = (
	self: Decimal,
	exponent: number,
	precision: number,
): Decimal => {
	const keep = precision + 8;
	let accumulator: RawDecimal = [1n, 0];
	let base = self.raw;
	let remaining = Math.abs(exponent);
	while (remaining > 0) {
		if (remaining % 2 === 1) {
			accumulator = multiplyStep(accumulator, base, keep);
		}
		remaining = Math.floor(remaining / 2);
		// The square after the final bit is skipped: its result is discarded,
		// and squaring it could trip the range guard on a representable one.
		if (remaining > 0) {
			base = multiplyStep(base, base, keep);
		}
	}
	if (exponent < 0) {
		return new Decimal(
			divideToPrecision([1n, 0], accumulator, precision, Decimal.rounding),
		);
	}
	return new Decimal(
		roundToPrecision(accumulator, precision, Decimal.rounding),
	);
};

/**
 * Raises `self` to the parsed exponent as described in the public JSDoc,
 * taking the exact squaring path for safe-integer integer exponents and the
 * natural-logarithm chain for everything else.
 */
const powDecimal = (self: Decimal, exponent: DecimalLike): Decimal => {
	const [yc, ye] = parse(exponent);

	// x^0 = 1.
	if (yc === 0n) {
		return new Decimal(1n);
	}

	// 0^y is 0 for a positive exponent; a negative one has no value on a
	// finite-only number line. The exponent value's sign is its nonzero
	// coefficient's sign (its own field may be zero, e.g. −1).
	if (self.coefficient === 0n) {
		if (yc < 0n) {
			throw new RangeError(
				"Invalid Decimal operation: zero raised to a negative power",
			);
		}
		return self;
	}

	// 1^y = 1: the receiver itself, exact and unrounded.
	if (self.coefficient === 1n && self.exponent === 0) {
		return self;
	}

	const precision = currentPrecision();

	// x^1 = x on the `precision` digit grid.
	if (yc === 1n && ye === 0) {
		return new Decimal(roundToPrecision(self.raw, precision, Decimal.rounding));
	}

	// Normalized exponents with a non-negative field are exactly the integers.
	const exponentIsInteger = ye >= 0;
	if (exponentIsInteger) {
		// Cheap decade probe first: |y| ≥ 1e16 exceeds the safe-integer bound
		// outright, so only smaller exponents make materializing the integer
		// for the exact comparison worthwhile.
		if (ye + digitsOf(yc) - 1 <= 15) {
			const magnitude = abs(yc) * pow10(ye);
			if (magnitude <= MAX_SAFE_EXPONENT) {
				return integerPower(
					self,
					Number(yc < 0n ? -magnitude : magnitude),
					precision,
				);
			}
		}
	}

	// The chain path works on |x| and restores the sign from the integer
	// exponent's parity; a negative base paired with a non-integer exponent
	// has no real value.
	if (self.coefficient < 0n && !exponentIsInteger) {
		throw new RangeError(
			"Invalid Decimal operation: negative base with a non-integer exponent",
		);
	}

	// Chain path: a non-integer exponent, or an integer one beyond the
	// safe-integer bound.
	const negativeBase = self.coefficient < 0n;
	const negated = negativeBase && ye === 0 && (yc & 1n) === 1n;

	// Overflow estimate, before any computation: log10(|x|^y) = y·log10(|x|),
	// with log10(|x|) = log10(0.digits) + exponent + digits (the decade plus
	// one). The ±1 slack leaves borderline estimates to the chain's own range
	// guards, and estimates that degenerate to NaN simply fall through to
	// them.
	const magnitude: RawDecimal = [abs(self.coefficient), self.exponent];
	const digits = magnitude[0].toString();
	const estimate = Math.floor(
		Number(yc) *
			10 ** ye *
			(Math.log10(Number(`0.${digits}`)) + self.exponent + digits.length),
	);
	if (
		estimate > Decimal.exponentLimit + 1 ||
		estimate < -(Decimal.exponentLimit + 1)
	) {
		throw exponentRangeError(estimate);
	}

	// x^y = exp(y·ln|x|). An error of δ relative in ln|x| becomes an
	// absolute error of δ·|y·ln|x|| in the exponent and thus a relative one
	// in the result, so the working precision buys back the integer digits
	// of y·ln|x| (≈ the estimate's digits) on top of the guard digits.
	// |y·ln|x|| ≈ 2.3·|estimate|; a NaN estimate (|x| = 1) needs nothing.
	const amplification =
		Math.ceil(Math.log10((Math.abs(estimate) || 0) + 1)) + 1;
	const working = precision + POW_GUARD + amplification;
	const [lnCoefficient, lnExponent] = lnToPrecision(
		magnitude,
		working,
		"half-even",
	);
	const [resultCoefficient, resultExponent] = expToPrecision(
		[lnCoefficient * yc, lnExponent + ye],
		working,
		"half-even",
	);
	return new Decimal(
		roundApproximation(
			[negated ? -resultCoefficient : resultCoefficient, resultExponent],
			precision,
			Decimal.rounding,
		),
	);
};

extend(
	"pow",
	function pow(this: Decimal, exponent: DecimalLike): Decimal {
		return powDecimal(this, exponent);
	},
	["power"],
);
