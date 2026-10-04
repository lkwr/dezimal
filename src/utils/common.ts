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
