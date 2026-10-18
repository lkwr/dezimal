import { Decimal, type DecimalLike } from "../decimal.ts";
import { extendStatic } from "../utils/extend.ts";

// required extensions
import "../check/compare.ts";

declare module "dezi" {
	interface DecimalConstructor {
		/**
		 * Returns the smallest of the given values, compared exactly.
		 *
		 * Throws when called without arguments.
		 */
		min(...values: DecimalLike[]): Decimal;
	}
}

extendStatic("min", function min(...values: DecimalLike[]): Decimal {
	const [first, ...rest] = values;
	if (first === undefined)
		throw new RangeError(
			"Invalid Decimal operation: min requires at least one value",
		);

	let winner = new Decimal(first);
	for (const value of rest) {
		const candidate = new Decimal(value);
		if (candidate.compare(winner) < 0) winner = candidate;
	}

	return winner;
});
