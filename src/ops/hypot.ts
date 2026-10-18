import { Decimal, type DecimalLike, type RawDecimal } from "../decimal.ts";
import { addRaw } from "../utils/common.ts";
import { currentPrecision, currentRounding } from "../utils/config.ts";
import { extendStatic } from "../utils/extend.ts";
import { rootToPrecision } from "../utils/integer-roots.ts";
import { parse } from "../utils/parse.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface DecimalConstructor {
		/**
		 * Returns the square root of the sum of the squares of the given
		 * values, rounded to `Decimal.precision` significant digits using the
		 * `Decimal.rounding` mode. The sum of squares is exact and may exceed
		 * the exponent limit as long as the result does not.
		 */
		hypot(...values: DecimalLike[]): import("dezi").Decimal;
	}
}

extendStatic("hypot", function hypot(...values: DecimalLike[]): Decimal {
	let sum: RawDecimal = [0n, 0];
	for (const value of values) {
		const [coefficient, exponent] = parse(value);
		sum = addRaw(sum, [coefficient * coefficient, 2 * exponent]);
	}
	return new Decimal(
		rootToPrecision(sum, 2, currentPrecision(), currentRounding()),
	);
});
