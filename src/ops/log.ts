import { Decimal, type DecimalLike } from "../decimal.ts";
import { normalize } from "../utils/common.ts";
import { extend, extendStatic } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

// required extensions
import "../ops/ln.ts";
import "../ops/divide.ts";

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
 * `Decimal.rounding` mode. Extensions expose nothing below that precision,
 * unlike ln's in-file working digits, so the chain carries a worst case of
 * about two ulps instead of single-step correct rounding. The base defaults
 * to 10, mirroring decimal.js's common-logarithm default.
 */
const logDecimals = (value: DecimalLike, base?: DecimalLike): Decimal => {
	const [c, e] = normalize(parse(value));
	if (c <= 0n) {
		throw new RangeError(
			"Invalid Decimal operation: logarithm of a non-positive value",
		);
	}
	const [b, eb] = normalize(parse(base ?? 10n));
	if (b <= 0n) {
		throw new RangeError(
			"Invalid Decimal operation: logarithm of a non-positive base",
		);
	}
	if (b === 1n && eb === 0) {
		throw new RangeError(
			"Invalid Decimal operation: logarithm base equal to 1",
		);
	}
	return new Decimal([c, e]).ln().divide(new Decimal([b, eb]).ln());
};

extend("log", function log(this: Decimal, base?: DecimalLike): Decimal {
	return logDecimals(this, base);
});

extendStatic("log2", function log2(value: DecimalLike): Decimal {
	return logDecimals(value, 2n);
});

extendStatic("log10", function log10(value: DecimalLike): Decimal {
	return logDecimals(value, 10n);
});
