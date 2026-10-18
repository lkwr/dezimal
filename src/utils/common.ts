import type { RawDecimal } from "../decimal.ts";

export const TEN = 10n;

export const pow10 = (exponent: number): bigint => TEN ** BigInt(exponent);

export const abs = (value: bigint): bigint => (value < 0n ? -value : value);

/**
 * Strips trailing zeros from the coefficient, adjusting the exponent. Most
 * coefficients end in a nonzero digit and return after a single check; long
 * zero runs are stripped in doubling chunks of 10^1, 10^2, 10^4, … and the
 * rest is bisected back down, so a run of n zeros costs O(log n) divisions
 * instead of n.
 */
export const normalize = (value: RawDecimal): RawDecimal => {
	const [coefficient, exponent] = value;
	if (coefficient === 0n) return exponent === 0 ? value : [0n, 0];
	if (coefficient % TEN !== 0n) return value;

	let c = coefficient / TEN;
	let e = exponent + 1;
	let step = 1;
	for (let chunk = TEN; c % chunk === 0n; chunk *= chunk) {
		c /= chunk;
		e += step;
		step *= 2;
	}
	// Fewer than `step` zeros remain: strip them by binary decomposition.
	for (step >>= 1; step > 0; step >>= 1) {
		const chunk = pow10(step);
		if (c % chunk === 0n) {
			c /= chunk;
			e += step;
		}
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
