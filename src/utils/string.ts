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
