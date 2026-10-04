import { Decimal, type DecimalLike, type RawDecimal } from "../decimal.ts";
import { abs, digitsOf, normalize, pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";
import { roundToScale } from "../utils/rounding.ts";

// required extensions
import "../config/precision.ts";
import "../config/rounding-modes.ts";
import "../ops/absolute.ts";
import "../ops/divide.ts";
import "../ops/exp.ts";
import "../ops/ln.ts";
import "../ops/times.ts";

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

// Positive-integer exponents beyond this bound fall through to the logarithm
// chain; below it, the exact squaring loop stays cheap (≤ 53 iterations).
const MAX_SAFE_EXPONENT = 9007199254740991n;

/**
 * One multiplication of two signed pairs in the squaring loop. Beyond `keep`
 * significant digits the normalized product is truncated to `keep` digits,
 * rounding to nearest with ties up on magnitude (the internal convention of
 * ln's working helpers), with the dropped digit count shifting the exponent
 * numerically. Throws the house exponent error once the product is certainly
 * out of range.
 */
const multiplyStep = (
	a: RawDecimal,
	b: RawDecimal,
	keep: number,
): RawDecimal => {
	let [coefficient, exponent] = normalize([a[0] * b[0], a[1] + b[1]]);
	const magnitude = abs(coefficient); // nonzero: both operands are nonzero
	const digits = digitsOf(magnitude);
	if (digits > keep) {
		const divisor = pow10(digits - keep);
		let truncated = magnitude / divisor;
		if ((magnitude % divisor) * 2n >= divisor) {
			truncated += 1n;
		}
		[coefficient, exponent] = normalize([
			coefficient < 0n ? -truncated : truncated,
			exponent + digits - keep,
		]);
	}

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
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): ${coefficient}e${exponent}`,
		);
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
const integerPower = (self: Decimal, exponent: number): Decimal => {
	const precision = Decimal.precision;
	const keep = precision + 8;
	let accumulator: RawDecimal = [1n, 0];
	let base: RawDecimal = [self.coefficient, self.exponent];
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
		return new Decimal(1n).divide(new Decimal(accumulator));
	}
	const digits = digitsOf(accumulator[0]);
	const [coefficient, resultExponent] = roundToScale(
		accumulator,
		accumulator[1] + digits - precision,
		Decimal.rounding,
	);
	if (Math.abs(resultExponent) > Decimal.exponentLimit) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): ${coefficient}e${resultExponent}`,
		);
	}
	return new Decimal([coefficient, resultExponent]);
};

/**
 * Raises `self` to the parsed exponent as described in the public JSDoc,
 * taking the exact squaring path for safe-integer integer exponents and the
 * natural-logarithm chain for everything else.
 */
const powDecimals = (self: Decimal, exponent: DecimalLike): Decimal => {
	const [yc, ye] = normalize(parse(exponent));

	// x^0 = 1.
	if (yc === 0n) {
		return new Decimal([1n, 0]);
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
		return new Decimal([0n, 0]);
	}

	// 1^y = 1: the receiver itself, exact and unrounded.
	if (self.coefficient === 1n && self.exponent === 0) {
		return self;
	}

	// Precision is user-mutable without validation until a `set()` extension.
	const precision = Decimal.precision;
	if (precision < 1) {
		throw new RangeError(
			`Invalid Decimal precision: expected a positive integer, got ${precision}`,
		);
	}

	// x^1 = x on the `precision` digit grid, same construction as
	// to-significant-digits, with the house exponent-field guard.
	if (yc === 1n && ye === 0) {
		const digits = digitsOf(self.coefficient);
		const [coefficient, resultExponent] = roundToScale(
			[self.coefficient, self.exponent],
			self.exponent + digits - precision,
			Decimal.rounding,
		);
		if (Math.abs(resultExponent) > Decimal.exponentLimit) {
			throw new RangeError(
				`Decimal exponent out of range (±${Decimal.exponentLimit}): ${coefficient}e${resultExponent}`,
			);
		}
		return new Decimal([coefficient, resultExponent]);
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
				return integerPower(self, Number(yc < 0n ? -magnitude : magnitude));
			}
		}
	}

	// The chain path reads the receiver through ln(), so a negative base is
	// only meaningful with the integer parity decided inside the chain below;
	// a negative base paired with a non-integer exponent has no real value.
	if (self.coefficient < 0n && !exponentIsInteger) {
		throw new RangeError(
			"Invalid Decimal operation: negative base with a non-integer exponent",
		);
	}

	// Chain path: a non-integer exponent, or an integer one beyond the
	// safe-integer bound.
	const exponentPair: RawDecimal = [yc, ye];
	const negativeBase = self.coefficient < 0n;
	const negated = negativeBase && ye === 0 && (yc & 1n) === 1n;

	// Overflow estimate, before any computation: log10(|x|^y) = y·log10(|x|),
	// with log10(|x|) = log10(0.digits) + exponent + digits (the decade plus
	// one). The ±1 slack leaves borderline estimates to the chain's own range
	// guards, and estimates that degenerate to NaN simply fall through to
	// them.
	const base = negativeBase ? self.absolute() : self;
	const digits = abs(base.coefficient).toString();
	const estimate = Math.floor(
		Number(yc) *
			10 ** ye *
			(Math.log10(Number(`0.${digits}`)) + base.exponent + digits.length),
	);
	if (
		estimate > Decimal.exponentLimit + 1 ||
		estimate < -(Decimal.exponentLimit + 1)
	) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): 1e${estimate < 0 ? "-" : ""}${Decimal.exponentLimit + 1}`,
		);
	}

	const result = base.ln().times(exponentPair).exp();
	return negated ? new Decimal([-result.coefficient, result.exponent]) : result;
};

extend(
	"pow",
	function pow(this: Decimal, exponent: DecimalLike): Decimal {
		return powDecimals(this, exponent);
	},
	["power"],
);
