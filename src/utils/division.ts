import type { RoundingMode } from "dezimal";
import type { RawDecimal } from "../decimal.ts";
import { abs, digitsOf, normalize, pow10 } from "./common.ts";
import { roundQuotient } from "./rounding.ts";

const assertNonZeroDivisor = (divisor: bigint): void => {
	if (divisor === 0n) {
		throw new RangeError("Invalid Decimal operation: division by zero");
	}
};

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

	assertNonZeroDivisor(divisorCoefficient);

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

/**
 * Divides two raw decimals to `digits` significant digits, rounding with
 * `mode`. The result is not normalized: its coefficient carries exactly
 * `digits` digits (one more after a rounding carry), so callers iterating on
 * the working grid keep every computed digit.
 */
export const divideToPrecision = (
	dividend: RawDecimal,
	divisor: RawDecimal,
	digits: number,
	mode: RoundingMode,
): RawDecimal => {
	const [a, dividendExponent] = dividend;
	const [b, divisorExponent] = divisor;
	assertNonZeroDivisor(b);
	if (a === 0n) {
		return [0n, 0];
	}

	const negative = a < 0n !== b < 0n;
	const dividendMagnitude = abs(a);
	const divisorMagnitude = abs(b);

	// The coefficient quotient lies in (10^(leading-1), 10^(leading+1)) by
	// digit counts; one comparison pins it into [10^leading, 10^(leading+1)).
	const dividendDigits = digitsOf(dividendMagnitude);
	const divisorDigits = digitsOf(divisorMagnitude);
	let leading = dividendDigits - divisorDigits;
	if (
		leading >= 0
			? dividendMagnitude < divisorMagnitude * pow10(leading)
			: dividendMagnitude * pow10(-leading) < divisorMagnitude
	) {
		leading -= 1;
	}

	// Scale the quotient into [10^(digits-1), 10^digits). The decimal
	// exponents are tracked numerically, so intermediates stay at about
	// `digits` plus the operands' own digit counts.
	const shift = digits - 1 - leading;
	const magnitude =
		shift >= 0
			? roundQuotient(
					dividendMagnitude * pow10(shift),
					divisorMagnitude,
					negative,
					mode,
				)
			: roundQuotient(
					dividendMagnitude,
					divisorMagnitude * pow10(-shift),
					negative,
					mode,
				);
	return [
		negative ? -magnitude : magnitude,
		dividendExponent - divisorExponent - shift,
	];
};
