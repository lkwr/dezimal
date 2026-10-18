import type { RoundingMode } from "dezi";
import { Decimal, type DecimalLike } from "../decimal.ts";
import { abs, pow10 } from "../utils/common.ts";
import { currentRounding } from "../utils/config.ts";
import { extend } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";
import { roundQuotient } from "../utils/rounding.ts";

// required extensions
import "../config/rounding-modes.ts";

declare module "dezi" {
	interface Decimal {
		/**
		 * Returns the nearest multiple of the given base, rounding `value / base`
		 * to an integer with the given mode (default: the `Decimal.rounding`
		 * mode). Exact: never rounds to `Decimal.precision` digits.
		 */
		toNearest(base: DecimalLike, mode?: RoundingMode): Decimal;
	}
}

extend(
	"toNearest",
	function toNearest(
		this: Decimal,
		base: DecimalLike,
		mode?: RoundingMode,
	): Decimal {
		const [b, eb] = parse(base);
		if (b === 0n) {
			throw new RangeError("Invalid Decimal operation: division by zero");
		}
		const { coefficient: a, exponent: ea } = this;
		if (a === 0n) {
			return this;
		}

		// k = round(value / base) from one exact BigInt division of the
		// exponent-aligned magnitudes. k is negative exactly when value and
		// base differ in sign, which is what "ceil"/"floor" refer to.
		const negative = a < 0n !== b < 0n;
		const k =
			ea >= eb
				? roundQuotient(
						abs(a) * pow10(ea - eb),
						abs(b),
						negative,
						currentRounding(mode),
					)
				: roundQuotient(
						abs(a),
						abs(b) * pow10(eb - ea),
						negative,
						currentRounding(mode),
					);

		// The result is the exact product k × base.
		return new Decimal([(negative ? -k : k) * b, eb]);
	},
);
