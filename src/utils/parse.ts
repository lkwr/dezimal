import { Decimal, type DecimalLike, type RawDecimal } from "../decimal.ts";
import { normalize } from "./common.ts";

export const NUMERIC_PATTERN =
	/^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/;

/**
 * Converts any `DecimalLike` into the canonical raw form every Decimal
 * holds: normalized (no trailing zeros, zero as `[0n, 0]`) with an exponent
 * within `±Decimal.exponentLimit`. Throws a TypeError for malformed input and
 * a RangeError for non-finite numbers or out-of-range exponents.
 */
export const parse = (decimal: DecimalLike): RawDecimal => {
	if (decimal instanceof Decimal) {
		return [decimal.coefficient, decimal.exponent];
	}
	return checkRange(normalize(parseUnchecked(decimal)));
};

/** The error for a value whose exponent leaves `±Decimal.exponentLimit`. */
export const exponentRangeError = (exponent: number): RangeError =>
	new RangeError(
		`Decimal exponent out of range (±${Decimal.exponentLimit}): ${exponent}`,
	);

/** Throws unless the normalized exponent lies within `±Decimal.exponentLimit`. */
const checkRange = (value: RawDecimal): RawDecimal => {
	// Negated form so a NaN exponent (from an absurdly long exponent string)
	// is rejected too.
	if (!(Math.abs(value[1]) <= Decimal.exponentLimit)) {
		throw exponentRangeError(value[1]);
	}
	return value;
};

const parseUnchecked = (decimal: DecimalLike): RawDecimal => {
	switch (typeof decimal) {
		case "bigint":
			return [decimal, 0];
		case "number":
			if (!Number.isFinite(decimal))
				throw new RangeError(
					`Invalid Decimal value: decimal must be finite, got ${decimal}`,
				);
			return parseString(decimal.toString());
		case "string":
			return parseString(decimal);
		case "object": {
			if (!Array.isArray(decimal))
				throw new TypeError(
					`Invalid Decimal value: expected Decimal or raw decimal tuple, got ${decimal}`,
				);

			const [coefficient, exponent] = decimal;

			if (
				typeof coefficient !== "bigint" ||
				typeof exponent !== "number" ||
				!Number.isSafeInteger(exponent)
			)
				throw new TypeError(
					`Invalid Decimal value: expected [bigint, number] tuple, got ${decimal}`,
					{ cause: decimal },
				);

			return [coefficient, exponent];
		}
	}

	throw new TypeError(
		`Invalid Decimal value: expected string, number, bigint or Decimal, got ${typeof decimal}`,
		{ cause: decimal },
	);
};

const parseString = (decimal: string): RawDecimal => {
	const match = NUMERIC_PATTERN.exec(decimal);
	if (!match) throw new TypeError(`Invalid Decimal value: "${decimal}"`);

	const sign = match[1] === "-" ? -1n : 1n;
	const digitsPart = match[2] ?? "0";
	const pointIndex = digitsPart.indexOf(".");
	const fractionalDigits =
		pointIndex === -1 ? 0 : digitsPart.length - pointIndex - 1;
	const exponent = (match[3] ? Number(match[3]) : 0) - fractionalDigits;
	return [sign * BigInt(digitsPart.replace(".", "")), exponent];
};
