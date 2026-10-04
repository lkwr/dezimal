import type { RawDecimal } from "../decimal.ts";

export const TEN = 10n;

export const pow10 = (exponent: number): bigint => TEN ** BigInt(exponent);

export const abs = (value: bigint): bigint => (value < 0n ? -value : value);

/** Strips trailing zeros from the coefficient, adjusting the exponent. */
export const normalize = ([coefficient, exponent]: RawDecimal): RawDecimal => {
	if (coefficient === 0n) {
		return [0n, 0];
	}
	let c = coefficient;
	let e = exponent;
	while (c % TEN === 0n) {
		c /= TEN;
		e += 1;
	}
	return [c, e];
};

/** Digit count of a bigint's magnitude (sign excluded). */
export const digitsOf = (coefficient: bigint): number =>
	abs(coefficient).toString().length;

// Float estimates only: they merely seed searches that exact bigint
// comparisons verify downstream, so double precision is plenty.
export const LOG2_10 = Math.log2(10);
export const LOG10_2 = Math.log10(2);
