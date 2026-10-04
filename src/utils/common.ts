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

/**
 * Adds two raw decimals after aligning exponents to the smaller one. Zero
 * operands short-circuit before alignment: aligning exponents can materialize
 * a power of ten across the whole exponent gap, which is pure waste against
 * a zero coefficient. The caller wraps the result in `new Decimal(...)`, which
 * canonicalizes zero and strips trailing zeros.
 */
export const addRaw = (self: RawDecimal, other: RawDecimal): RawDecimal => {
	if (self[0] === 0n) return other;
	if (other[0] === 0n) return self;
	const exponent = Math.min(self[1], other[1]);
	return [
		(self[1] === exponent ? self[0] : self[0] * pow10(self[1] - exponent)) +
			(other[1] === exponent
				? other[0]
				: other[0] * pow10(other[1] - exponent)),
		exponent,
	];
};

// Float estimates only: they merely seed searches that exact bigint
// comparisons verify downstream, so double precision is plenty.
export const LOG2_10 = Math.log2(10);
export const LOG10_2 = Math.log10(2);
