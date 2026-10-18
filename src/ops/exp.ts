import { Decimal } from "../decimal.ts";
import { abs, digitsOf, LOG2_10, LOG10_2, pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { currentPrecision } from "../utils/precision.ts";
import { roundToPrecision } from "../utils/rounding.ts";

// required extensions
import "../config/ln10.ts";
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns e (Euler's number) raised to this value, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode.
		 */
		exp(): Decimal;
	}
}

/**
 * Computes e raised to `value` to `Decimal.precision` significant digits,
 * rounding with `Decimal.rounding`.
 */
const expDecimal = (value: Decimal): Decimal => {
	const { coefficient: c, exponent: e } = value;
	if (c === 0n) {
		return new Decimal(1n);
	}

	// ln(10) comes from the overridable config static (like
	// `Decimal.precision`): the default pins ln(10) to 30 digits, so ln(10)
	// lies in [ln10·10^-30, (ln10 + 1)·10^-30) and supplies the irrational
	// threshold for the exact bigint comparisons below.
	const { coefficient: ln10C, exponent: ln10E } = Decimal.ln10;

	// log10(e^x) = x/ln(10), so |x| >= (limit + 1)·ln(10) pushes the leading
	// decade past the exponent limit in both directions: certainly out of
	// range, thrown before any computation. The threshold is compared exactly
	// as ceil((limit + 1)·ln(10)·10^30)/10^30; with x = |c|·10^e bracketed in
	// [10^(d - 1 + e), 10^(d + e)), the digit count d + e decides outright
	// except inside a single decade, which one exact bigint compare resolves.
	const a = abs(c);
	const d = digitsOf(a);
	const certainScaled = BigInt(Decimal.exponentLimit + 1) * (ln10C + 1n);
	const band = digitsOf(certainScaled) + ln10E;
	const certain =
		d + e > band ||
		(d + e === band &&
			(e - ln10E < 0
				? a >= certainScaled * pow10(ln10E - e)
				: a * pow10(e - ln10E) >= certainScaled));
	if (certain) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): 1e${c < 0n ? "-" : ""}${Decimal.exponentLimit + 1}`,
		);
	}

	const precision = currentPrecision();

	// Argument reduction: k is the smallest integer with |x|/2^k <= 1, decided
	// by exact bigint comparisons against the powers of two (the float estimate
	// only seeds the loop). The certainty check above keeps |x| below
	// (limit + 1)·ln(10) ≈ 2.31e6, so k <= 22.
	//
	// |x| <= 2^m, exact: for e >= 0 the product stays tiny (d + e <= 7 after
	// the certainty check), for e < 0 the power of ten moves to the other
	// side, sized by the coefficient itself.
	const within = (m: number): boolean =>
		e >= 0
			? a * pow10(e) <= 1n << BigInt(m)
			: a <= (1n << BigInt(m)) * pow10(-e);
	let k = 0;
	if (d + e > 0) {
		k = Math.max(0, Math.ceil((d - 1 + e) * LOG2_10) - 2);
		while (!within(k)) {
			k += 1;
		}
	}

	// Working scale. The Taylor sum below carries a relative error of a few
	// 10^-scale; every squaring then doubles the incoming relative error and
	// adds one truncation ulp, so the error grows by ~10^(k·log10(2)) overall.
	// guard = ceil(k·log10(2)) + 8 buys exactly that amplification back and
	// still leaves the final value good to ~10^-(precision + 7) relative —
	// deep enough that rounding decisions are wrong only within a ~10^-7 ulp
	// fraction of a boundary.
	const guard = Math.ceil(k * LOG10_2) + 8;
	const scale = precision + guard;
	const scalePow = pow10(scale);

	// r = x/2^k is exact in decimal (multiplying by 5^k and shifting the
	// exponent), kept as a signed integer scaled to the working scale and
	// truncated only when more than `scale` fractional digits would be needed.
	// The sign stays folded into the coefficient, so the alternating series
	// for negative arguments needs no special cases.
	const rc = c * 5n ** BigInt(k);
	const rShift = e - k + scale;
	const rd = digitsOf(abs(rc));
	let r = 0n;
	if (rd + rShift >= 1) {
		const magnitude =
			rShift >= 0 ? abs(rc) * pow10(rShift) : abs(rc) / pow10(-rShift);
		r = rc < 0n ? -magnitude : magnitude;
	}

	// Taylor series r^0/0! + r^1/1! + r^2/2! + ... at the working scale,
	// terminated once a term truncates to zero: the untruncated tail is far
	// below one ulp, and every floor() only biases the sum downwards.
	let term = scalePow;
	let sum = term;
	for (let n = 1n; term !== 0n; n += 1n) {
		term = (term * r) / (n * scalePow);
		sum += term;
	}

	// value = sum·10^workExponent, squared k times back up to e^x. Each square
	// is truncated to `scale` significant digits (dropped is always positive,
	// since the working value carries ~scale digits) and the exponent is
	// tracked numerically — 10^huge is never materialized.
	let work = sum;
	let workExponent = -scale;
	for (let i = 0; i < k; i += 1) {
		const square = work * work;
		const dropped = digitsOf(square) - scale;
		work = square / pow10(dropped);
		workExponent = 2 * workExponent + dropped;
	}

	// Round the working value to `precision` significant digits. The plain
	// remainder-vs-half test is honest about its limits: the working value is
	// already an approximation, so a true halfway tie in e^x cannot be
	// resolved beyond the ~10^-7 ulp honesty of the guard digits — e^x's
	// transcendence keeps exact boundary coincidences out of reach. The
	// constructor's range check catches the underflow direction (deeply
	// negative arguments) that the certainty check above leaves through.
	return new Decimal(
		roundToPrecision([work, workExponent], precision, Decimal.rounding),
	);
};

extend("exp", function exp(this: Decimal): Decimal {
	return expDecimal(this);
});
