import type { RoundingMode } from "dezi";
import type { RawDecimal } from "../decimal.ts";
import { abs, normalize, pow10 } from "./common.ts";

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
	const positive = sign > 0n;
	const negative = sign < 0n;

	let increment: boolean;
	switch (mode) {
		case "up":
			increment = discarded;
			break;
		case "down":
			increment = false;
			break;
		case "ceil":
			increment = discarded && positive;
			break;
		case "floor":
			increment = discarded && negative;
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
			increment = overHalf || (atHalf && positive);
			break;
		case "half-floor":
			increment = overHalf || (atHalf && negative);
			break;
	}

	if (increment) {
		q += 1n;
	}

	// normalize absorbs a carry such as 999 -> 1000.
	return normalize([sign * q, targetExponent]);
};
