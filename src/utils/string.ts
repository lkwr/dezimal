/** Formats significant digits in exponential notation, padded to `totalDigits` if given. */
export const exponentialString = (
	sign: string,
	digits: string,
	leadingPower: number,
	totalDigits?: number,
): string => {
	const padded =
		totalDigits === undefined ? digits : digits.padEnd(totalDigits, "0");
	const fraction = padded.length > 1 ? `.${padded.slice(1)}` : "";
	const e = leadingPower >= 0 ? `e+${leadingPower}` : `e${leadingPower}`;
	return `${sign}${padded.slice(0, 1)}${fraction}${e}`;
};

/**
 * Formats `digits × 10^exponent` in plain notation, padding the fraction with
 * zeros to at least `fractionDigits` digits.
 */
export const plainString = (
	sign: string,
	digits: string,
	exponent: number,
	fractionDigits = 0,
): string => {
	if (exponent >= 0) {
		const integer = digits + "0".repeat(exponent);
		return fractionDigits > 0
			? `${sign}${integer}.${"0".repeat(fractionDigits)}`
			: sign + integer;
	}
	const pointIndex = digits.length + exponent;
	const integer = pointIndex > 0 ? digits.slice(0, pointIndex) : "0";
	const fraction = (
		pointIndex > 0 ? digits.slice(pointIndex) : "0".repeat(-pointIndex) + digits
	).padEnd(fractionDigits, "0");
	return `${sign}${integer}.${fraction}`;
};
