import type { RoundingMode } from "dezi";
import type { RawDecimal } from "../decimal.ts";
import { abs, normalize, pow10 } from "./common.ts";

export type RoundingDecision = {
	/** Any nonzero part was truncated away. */
	discarded: boolean;
	/** The discarded part is strictly beyond the halfway point. */
	overHalf: boolean;
	/** The discarded part sits exactly at the halfway point. */
	atHalf: boolean;
	/** The truncated coefficient is odd; drives the half-even tie. */
	isOdd: boolean;
	/** The coefficient's sign is positive (ceil/towards +Infinity semantics). */
	positive: boolean;
	/** The coefficient's sign is negative (floor/towards −Infinity semantics). */
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
	{ discarded, overHalf, atHalf, isOdd, positive, negative }: RoundingDecision,
): boolean => {
	switch (mode) {
		case "up":
			return discarded;
		case "down":
			return false;
		case "ceil":
			return discarded && positive;
		case "floor":
			return discarded && negative;
		case "half-up":
			return overHalf || atHalf;
		case "half-down":
			return overHalf;
		case "half-even":
			return overHalf || (atHalf && isOdd);
		case "half-ceil":
			return overHalf || (atHalf && positive);
		case "half-floor":
			return overHalf || (atHalf && negative);
	}
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

	if (coefficient === 0n) {
		return [0n, 0];
	}

	// Already on the grid of 10^targetExponent: nothing to round away. Not
	// materializing pow10 here keeps giant targetExponent inputs cheap.
	if (exponent >= targetExponent) {
		return normalize(value);
	}

	const scale = pow10(targetExponent - exponent);
	const magnitude = abs(coefficient);
	const sign = coefficient < 0n ? -1n : 1n;
	let q = magnitude / scale; // BigInt division truncates towards zero
	const r = magnitude % scale;

	const discarded = r > 0n;
	const overHalf = r * 2n > scale;
	const atHalf = r * 2n === scale;
	if (
		roundingIncrement(mode, {
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

	// normalize absorbs a carry such as 999 -> 1000.
	return normalize([sign * q, targetExponent]);
};
