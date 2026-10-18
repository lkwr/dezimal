import { Decimal, type DecimalLike } from "../decimal.ts";
import { extend, extendStatic } from "../utils/extend.ts";

// required extensions
import "./ln.ts";
import "./divide.ts";

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

/**
 * Computes the logarithm of `value` in `base` as the quotient of the two
 * public `ln()` results, so each logarithm and the final divide round to
 * `Decimal.precision` significant digits with the configured
 * `Decimal.rounding` mode. The chain therefore carries a worst case of about
 * two ulps instead of single-step correct rounding.
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
	return value.ln().divide(divisor.ln());
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
