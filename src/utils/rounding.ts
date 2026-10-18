import type { RoundingMode } from "dezi";
import type { RawDecimal } from "../decimal.ts";
import { abs, addRaw, digitsOf, normalize, pow10 } from "./common.ts";

export type RoundingDecision = {
	/** Any nonzero part was truncated away. */
	discarded: boolean;
	/** The discarded part is strictly beyond the halfway point. */
	overHalf: boolean;
	/** The discarded part sits exactly at the halfway point. */
	atHalf: boolean;
	/** The truncated magnitude is odd; drives the half-even tie. */
	isOdd: boolean;
	/** The rounded value is negative; drives the ceil/floor family. */
	negative: boolean;
};

/**
 * Resolves the nine rounding modes against a truncation decision: whether the
 * truncated magnitude should be incremented. Universal primitive shared by
 * every operation that rounds — callers derive the exact `overHalf`/`atHalf`
 * probes for their own shape (exact grid, root half-ulp, working
 * approximation) and this switch applies the configured mode to them.
 */
export const roundingIncrement = (
	mode: RoundingMode,
	{ discarded, overHalf, atHalf, isOdd, negative }: RoundingDecision,
): boolean => {
	switch (mode) {
		case "up":
			return discarded;
		case "down":
			return false;
		case "ceil":
			return discarded && !negative;
		case "floor":
			return discarded && negative;
		case "half-up":
			return overHalf || atHalf;
		case "half-down":
			return overHalf;
		case "half-even":
			return overHalf || (atHalf && isOdd);
		case "half-ceil":
			return overHalf || (atHalf && !negative);
		case "half-floor":
			return overHalf || (atHalf && negative);
	}
};

/**
 * Rounds the exact quotient `numerator / denominator` of two non-negative
 * integers to an integer magnitude according to `mode`; `negative` is the
 * sign the caller attaches to the result.
 */
export const roundQuotient = (
	numerator: bigint,
	denominator: bigint,
	negative: boolean,
	mode: RoundingMode,
): bigint => {
	const quotient = numerator / denominator;
	const twice = (numerator % denominator) * 2n;
	const increment = roundingIncrement(mode, {
		discarded: twice > 0n,
		overHalf: twice > denominator,
		atHalf: twice === denominator,
		isOdd: (quotient & 1n) === 1n,
		negative,
	});
	return increment ? quotient + 1n : quotient;
};

/**
 * Rounds `coefficient × 10^exponent` to the nearest multiple of
 * `10^targetExponent` according to `mode`, returning a normalized
 * RawDecimal. Universal primitive shared by quantize-style operations.
 */
export const roundToScale = (
	value: RawDecimal,
	targetExponent: number,
	mode: RoundingMode,
): RawDecimal => {
	const [coefficient, exponent] = value;

	// Already on the grid of 10^targetExponent: nothing to round away. Not
	// materializing pow10 here keeps giant targetExponent inputs cheap.
	if (coefficient === 0n || exponent >= targetExponent) {
		return normalize(value);
	}

	const negative = coefficient < 0n;
	const magnitude = roundQuotient(
		abs(coefficient),
		pow10(targetExponent - exponent),
		negative,
		mode,
	);
	// normalize absorbs a carry such as 999 -> 1000.
	return normalize([negative ? -magnitude : magnitude, targetExponent]);
};

/**
 * Rounds `value` to `digits` significant digits according to `mode`,
 * returning a normalized RawDecimal.
 */
export const roundToPrecision = (
	value: RawDecimal,
	digits: number,
	mode: RoundingMode,
): RawDecimal =>
	roundToScale(value, value[1] + digitsOf(value[0]) - digits, mode);

/** Units in the last place within which an approximation snaps to the grid. */
const SNAP_TOLERANCE = 100n;

/**
 * Rounds an approximation that carries guard digits beyond `digits` to
 * `digits` significant digits. An approximation within a few units of its
 * last place from a value on the target grid is snapped to that value:
 * exactly representable results such as log10(1000) or 4^0.5 then survive
 * the directed modes, while a transcendental result lands that close to the
 * grid only with negligible probability (~10^-8 at ten guard digits).
 */
export const roundApproximation = (
	value: RawDecimal,
	digits: number,
	mode: RoundingMode,
): RawDecimal => {
	const nearest = roundToPrecision(value, digits, "half-even");
	const [difference, exponent] = addRaw(value, [-nearest[0], nearest[1]]);
	// Aligned on the finer of the two grids, which is the value's own.
	const snap =
		difference === 0n ||
		abs(difference) * pow10(exponent - value[1]) <= SNAP_TOLERANCE;
	return snap ? nearest : roundToPrecision(value, digits, mode);
};
