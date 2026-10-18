import { Decimal, type DecimalLike } from "../decimal.ts";
import { divideToPrecision } from "../utils/division.ts";
import { extend, extendStatic } from "../utils/extend.ts";
import { lnToPrecision } from "../utils/logarithm.ts";
import { currentPrecision } from "../utils/precision.ts";
import { roundApproximation } from "../utils/rounding.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the logarithm of this value in the given base, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode. Without a base, the base-10 logarithm is returned.
		 */
		log(base?: DecimalLike): Decimal;
	}

	interface DecimalConstructor {
		/**
		 * Returns the base-2 logarithm of the value, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode.
		 */
		log2(value: DecimalLike): Decimal;
		/**
		 * Returns the base-10 logarithm of the value, rounded to
		 * `Decimal.precision` significant digits using the `Decimal.rounding`
		 * mode.
		 */
		log10(value: DecimalLike): Decimal;
	}
}

/** Digits beyond the target precision carried by the intermediate logarithms. */
const LOG_GUARD = 10;

/**
 * Computes the logarithm of `value` in `base` as ln(value)/ln(base). Both
 * logarithms and their quotient are carried `LOG_GUARD` digits beyond
 * `Decimal.precision`, so only the final rounding (with `Decimal.rounding`)
 * reaches the result.
 */
const logDecimal = (value: Decimal, base: DecimalLike): Decimal => {
	if (value.coefficient <= 0n) {
		throw new RangeError(
			"Invalid Decimal operation: logarithm of a non-positive value",
		);
	}
	const divisor = new Decimal(base);
	if (divisor.coefficient <= 0n) {
		throw new RangeError(
			"Invalid Decimal operation: logarithm of a non-positive base",
		);
	}
	if (divisor.coefficient === 1n && divisor.exponent === 0) {
		throw new RangeError(
			"Invalid Decimal operation: logarithm base equal to 1",
		);
	}
	const precision = currentPrecision();
	const working = precision + LOG_GUARD;
	const quotient = divideToPrecision(
		lnToPrecision(value.raw, working, "half-even"),
		lnToPrecision(divisor.raw, working, "half-even"),
		working,
		"half-even",
	);
	return new Decimal(roundApproximation(quotient, precision, Decimal.rounding));
};

extend("log", function log(this: Decimal, base?: DecimalLike): Decimal {
	return logDecimal(this, base ?? 10n);
});

extendStatic("log2", function log2(value: DecimalLike): Decimal {
	return logDecimal(new Decimal(value), 2n);
});

extendStatic("log10", function log10(value: DecimalLike): Decimal {
	return logDecimal(new Decimal(value), 10n);
});
