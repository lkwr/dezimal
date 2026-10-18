import type { RoundingMode } from "dezi";
import type { RawDecimal } from "../decimal.ts";
import { abs, digitsOf, normalize, pow10 } from "./common.ts";
import { roundingIncrement } from "./rounding.ts";

/**
 * Float seed at or above the integer `degree`-th root of n ≥ 0: the root of
 * n's leading ~50 bits, rounded up and padded by one before scaling back, so
 * Newton only has to close a ~2^-24 relative gap from above.
 */
const rootSeed = (n: bigint, degree: 2 | 3): bigint => {
	// Hex digits bound the bit length cheaply; the shift is a multiple of the
	// degree so it splits evenly across the root.
	const bits = n.toString(16).length * 4;
	const shift = Math.max(0, Math.ceil((bits - 50) / degree) * degree);
	const top = Number(n >> BigInt(shift));
	const root = degree === 2 ? Math.sqrt(top) : Math.cbrt(top);
	return (BigInt(Math.ceil(root)) + 1n) << BigInt(shift / degree);
};

/** Newton iteration for floor(√n), n ≥ 0. */
export const isqrt = (n: bigint): bigint => {
	if (n < 2n) {
		return n;
	}
	// From a start at or above the root, Newton iterates decrease strictly
	// until they reach floor(√n).
	let x = rootSeed(n, 2);
	let y = (x + n / x) >> 1n;
	while (y < x) {
		x = y;
		y = (x + n / x) >> 1n;
	}
	return x;
};

/** Newton iteration for floor(∛n), n ≥ 0. */
export const icbrt = (n: bigint): bigint => {
	if (n < 2n) {
		return n;
	}
	// Real Newton iterates y ← (2y + n/y²)/3 never drop below ∛n — AM-GM
	// gives (y + y + n/y²)/3 ≥ (n)^(1/3) — and shrink strictly while above
	// it (n/y² < y ⟺ n < y³), so from a start at or above the root the
	// integer sequence reaches floor(∛n) and stops once the next step stops
	// decreasing.
	let x = rootSeed(n, 3);
	let y = (2n * x + n / (x * x)) / 3n;
	while (y < x) {
		x = y;
		y = (2n * x + n / (x * x)) / 3n;
	}
	return x;
};

/**
 * Real square (`degree` 2) or cube (`degree` 3) root of a raw decimal,
 * correctly rounded to `digits` significant digits with `mode` and returned
 * normalized. Cube roots keep the sign; square roots expect a non-negative
 * value.
 */
export const rootToPrecision = (
	value: RawDecimal,
	degree: 2 | 3,
	digits: number,
	mode: RoundingMode,
): RawDecimal => {
	const [coefficient, exponent] = value;
	if (coefficient === 0n) {
		return [0n, 0];
	}
	const negative = coefficient < 0n;

	// Make the exponent a multiple of the degree: value = c × 10^e, so the
	// root is root(c) × 10^(e/degree).
	const residue = ((exponent % degree) + degree) % degree;
	const c = abs(coefficient) * pow10(residue);
	const e = exponent - residue;

	// Floor of log10(root(c)), from digit counts alone: c spans
	// [10^m, 10^(m+1)) with m = digits(c) - 1, so its root sits in the decade
	// starting at 10^floor(m/degree).
	const leading = Math.floor((digitsOf(c) - 1) / degree);

	// Target Q = root(c) × 10^t with t = digits - 1 - leading, which carries
	// exactly `digits` significant digits. For t < 0 the integer root keeps
	// `guard` extra digits that are scaled back out below, so W is always an
	// integer: about degree·digits digits wide, or c itself.
	const t = digits - 1 - leading;
	const guard = t < 0 ? -t : 0;
	const W = c * pow10(degree * (t + guard));
	const root = degree === 2 ? isqrt(W) : icbrt(W);
	const scaleOut = pow10(guard);
	const low = root % scaleOut;
	const q = root / scaleOut;

	// Half-ulp decision, all-integer: the exact root is root + f, and the
	// halfway point between q and q + 1 sits at root + D/2 with
	// D = scaleOut - 2·low. Comparing f against D/2 in root space reduces to
	// 2^degree·W vs (2·root + D)^degree.
	const scaledW = W << BigInt(degree);
	const boundary = (2n * root + scaleOut - 2n * low) ** BigInt(degree);
	const increment = roundingIncrement(mode, {
		discarded: low > 0n || W > root ** BigInt(degree),
		overHalf: scaledW > boundary,
		atHalf: scaledW === boundary,
		isOdd: (q & 1n) === 1n,
		negative,
	});
	const magnitude = increment ? q + 1n : q;

	// normalize() absorbs a rounding carry such as 9.99..9 → 10^k.
	return normalize([
		negative ? -magnitude : magnitude,
		leading + e / degree - digits + 1,
	]);
};
