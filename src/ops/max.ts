import { Decimal, type DecimalLike } from "../decimal.ts";
import { extendStatic } from "../utils/extend.ts";

// required extensions
import "../check/compare.ts";

declare module "dezi" {
	interface DecimalConstructor {
		/**
		 * Returns the largest of the given values, compared exactly. Throws when
		 * called without arguments.
		 */
		max(...values: DecimalLike[]): import("dezi").Decimal;
	}
}

extendStatic("max", function max(...values: DecimalLike[]): Decimal {
	const [first, ...rest] = values;
	if (first === undefined) {
		throw new RangeError(
			"Invalid Decimal operation: max requires at least one value",
		);
	}
	let winner = new Decimal(first);
	for (const value of rest) {
		const candidate = new Decimal(value);
		if (candidate.compare(winner) > 0) winner = candidate;
	}
	return winner;
});
