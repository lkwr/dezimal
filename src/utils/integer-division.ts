import type { RawDecimal } from "../decimal.ts";
import { abs, normalize, pow10 } from "./common.ts";

export type TruncDivision = {
	/** Integer quotient truncated towards zero. */
	quotient: RawDecimal;
	/** Remainder whose sign follows the dividend (JavaScript `%` semantics). */
	remainder: RawDecimal;
};

/**
 * Exact truncating decimal division: the quotient is the integer part
 * truncated towards zero and the remainder carries the dividend's sign —
 * JavaScript `%` semantics, i.e. decimal.js's default ROUND_DOWN modulo
 * mode. Both members are returned normalized.
 */
export const truncDivide = (
	dividend: RawDecimal,
	divisor: RawDecimal,
): TruncDivision => {
	const [dividendCoefficient, dividendExponent] = dividend;
	const [divisorCoefficient, divisorExponent] = divisor;

	if (divisorCoefficient === 0n) {
		throw new RangeError("Invalid Decimal operation: division by zero");
	}

	if (dividendCoefficient === 0n) {
		return { quotient: [0n, 0], remainder: [0n, 0] };
	}

	const dividendMagnitude = abs(dividendCoefficient);
	const divisorMagnitude = abs(divisorCoefficient);

	// Align both values on a common scale in whichever direction is cheaper.
	const difference = dividendExponent - divisorExponent;

	let qInt: bigint;
	let remRaw: bigint;
	let remainderExponent: number;

	if (difference >= 0) {
		const numerator = dividendMagnitude * pow10(difference);
		qInt = numerator / divisorMagnitude;
		remRaw = numerator % divisorMagnitude;
		remainderExponent = divisorExponent;
	} else {
		const denominator = divisorMagnitude * pow10(-difference);
		qInt = dividendMagnitude / denominator;
		remRaw = dividendMagnitude % denominator;
		remainderExponent = dividendExponent;
	}

	const signQuotient =
		dividendCoefficient < 0n !== divisorCoefficient < 0n ? -1n : 1n;
	const signRemainder = dividendCoefficient < 0n ? -1n : 1n;

	return {
		quotient: normalize([signQuotient * qInt, 0]),
		remainder:
			remRaw === 0n
				? [0n, 0]
				: normalize([signRemainder * remRaw, remainderExponent]),
	};
};
