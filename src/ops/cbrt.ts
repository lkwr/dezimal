import { Decimal, type DecimalLike } from "../decimal.ts";
import { abs, digitsOf, normalize, pow10 } from "../utils/common.ts";
import { extend } from "../utils/extend.ts";
import { icbrt } from "../utils/integer-roots.ts";
import { parse } from "../utils/parse.ts";
import { roundingIncrement } from "../utils/rounding.ts";

// required extensions
import "../config/precision.ts";
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the real cube root, sign-preserving for negative values,
		 * rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode.
		 */
		cbrt(): Decimal;
	}
}

/**
 * Computes the real cube root of `value` to `Decimal.precision` significant
 * digits, rounding with `Decimal.rounding`.
 */
const cbrtDecimals = (value: DecimalLike): Decimal => {
	const [c, e] = normalize(parse(value));
	if (c === 0n) {
		return new Decimal([0n, 0]);
	}

	// The real cube root preserves the sign: work on |value| and restore the
	// sign at the end.
	const sign = c < 0n ? -1n : 1n;

	// Make the exponent a multiple of three: value = cPrime × 10^ePrime,
	// so cbrt = ∛cPrime × 10^(ePrime/3).
	let cPrime = abs(c);
	let ePrime = e;
	const residue = ((ePrime % 3) + 3) % 3;
	if (residue !== 0) {
		cPrime *= pow10(residue);
		ePrime -= residue;
	}

	const digitsC = digitsOf(cPrime);
	// Floor of log10(∛cPrime), from digit counts alone: ∛cPrime lies in
	// [10^sciExpRoot, 10^(sciExpRoot + 1)). cPrime spans [10^m, 10^(m+1))
	// with m = digitsC - 1, so ∛cPrime spans [10^(m/3), 10^((m+1)/3)), and
	// since (m+1)/3 ≤ floor(m/3) + 1 holds whenever m mod 3 ≤ 2 (always),
	// that whole interval sits inside the decade
	// [10^floor(m/3), 10^(floor(m/3) + 1)): floor(m/3) is always the root's
	// decade lower bound. Math.floor division rounds towards -Infinity for
	// negative m, the wanted decade bound in general (m ≥ 0 for any nonzero
	// normalized coefficient anyway).
	const sciExpRoot = Math.floor((digitsC - 1) / 3);

	// Precision is user-mutable without validation until a `set()` extension.
	const precision = Decimal.precision;
	if (precision < 1) {
		throw new RangeError(
			`Invalid Decimal precision: expected a positive integer, got ${precision}`,
		);
	}

	// Q = modeRound(∛cPrime × 10^t) with t = precision - 1 - sciExpRoot, so Q
	// lands in [10^(precision-1), 10^precision) and carries `precision`
	// significant digits.
	const t = precision - 1 - sciExpRoot;
	const guard = t < 0 ? -t : 0;
	const shift = t + guard; // ≥ 0

	// Bounded materialization: ∛W = ∛cPrime × 10^shift carries the full
	// `precision` significant digits, so W spans ~3·precision digits when
	// t ≥ 0 regardless of the input's exponent, and is cPrime itself (input
	// digit-bounded) when t < 0.
	const W = cPrime * pow10(3 * shift);
	const root = icbrt(W); // floor(∛W)
	const remainder = W - root * root * root; // W - root³ ≥ 0

	// 10^guard folds the sub-precision scale back out (1n when guard = 0).
	const scaleOut = pow10(guard);
	const low = root % scaleOut;

	// Half-ulp decision, all-integer: true = ∛W/scaleOut, so the fractional
	// part of true past q = root/scaleOut is (low + f)/scaleOut, where
	// f = ∛W - root, and the halfway point between q and q + 1 sits at
	// root + D/2, where D = scaleOut - 2·low (D = 1 when guard = 0, since
	// low = 0 then). The f > D/2 and f = D/2 tests reduce to 8W vs
	// (2·root + D)³ — the exact cube-root analog of the 4W vs (2·root + D)²
	// test in sqrt.ts, which compares the root against (root + 1/2), not
	// against the midpoint between root³ and (root+1)³. That distinction
	// matters for cubes: ∛16 = 2.52 would wrongly stay at 2 under a
	// cube-midpoint test, while the root-space test half-ups it to 3.
	const boundary = 2n * root + (guard === 0 ? 1n : scaleOut - low * 2n);
	const overHalf = 8n * W > boundary ** 3n;
	const atHalf = 8n * W === boundary ** 3n;
	const discarded = remainder > 0n || low > 0n;

	// The result's sign is known upfront, so the ±Infinity modes are decided
	// sign-aware: on a negative result "ceil" would move towards the signless
	// truncation, so only a positive result increments for "ceil"; the mirror
	// holds for "floor" and the half-ceil/half-floor ties.
	let q = root / scaleOut;

	if (
		roundingIncrement(Decimal.rounding, {
			discarded,
			overHalf,
			atHalf,
			isOdd: (q & 1n) === 1n,
			positive: sign > 0n,
			negative: sign < 0n,
		})
	) {
		q += 1n;
	}

	// Rounding may carry into a fresh power of ten (9.99..9 → 10^k), which
	// normalize() absorbs before the final range guard.
	let coefficient = sign * q;
	let resultExponent = sciExpRoot + ePrime / 3 - precision + 1;
	[coefficient, resultExponent] = normalize([coefficient, resultExponent]);
	if (Math.abs(resultExponent) > Decimal.exponentLimit) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): ${coefficient}e${resultExponent}`,
		);
	}
	return new Decimal([coefficient, resultExponent]);
};

extend("cbrt", function cbrt(this: Decimal): Decimal {
	return cbrtDecimals(this);
});
