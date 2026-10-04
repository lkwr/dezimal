import { Decimal, type DecimalLike, type RawDecimal } from "../decimal.ts";

export const NUMERIC_PATTERN =
	/^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/;

export const parse = (decimal: DecimalLike): RawDecimal => {
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
			if (decimal instanceof Decimal) return decimal.raw;
			if (!Array.isArray(decimal))
				throw new TypeError(
					`Invalid Decimal value: expected Decimal or raw decimal tuple, got ${decimal}`,
				);

			const [coefficient, exponent] = decimal;

			if (
				typeof coefficient !== "bigint" ||
				typeof exponent !== "number" ||
				!Number.isInteger(exponent)
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

export const parseString = (decimal: string): RawDecimal => {
	const match = NUMERIC_PATTERN.exec(decimal);
	if (!match) throw new TypeError(`Invalid Decimal value: "${decimal}"`);

	const sign = match[1] === "-" ? -1n : 1n;
	const digitsPart = match[2] ?? "0";
	const pointIndex = digitsPart.indexOf(".");
	const fractionalDigits =
		pointIndex === -1 ? 0 : digitsPart.length - pointIndex - 1;
	const digits = digitsPart.replace(".", "").replace(/^0+/, "");
	const exponent = (match[3] ? Number(match[3]) : 0) - fractionalDigits;
	if (
		!Number.isSafeInteger(exponent) ||
		Math.abs(exponent) > Decimal.exponentLimit
	) {
		throw new RangeError(
			`Decimal exponent out of range (±${Decimal.exponentLimit}): "${decimal}"`,
		);
	}
	return [sign * BigInt(digits === "" ? "0" : digits), exponent];
};
