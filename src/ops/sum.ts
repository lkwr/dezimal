import { Decimal, type DecimalLike } from "../decimal.ts";
import { extendStatic } from "../utils/extend.ts";

// required extensions
import "./plus.ts";

declare module "dezi" {
	interface DecimalConstructor {
		/**
		 * Returns the sum of the given values, computed exactly.
		 */
		sum(...values: DecimalLike[]): Decimal;
	}
}

extendStatic("sum", function sum(...values: DecimalLike[]): Decimal {
	const [first, ...rest] = values;
	if (first === undefined) {
		throw new RangeError(
			"Invalid Decimal operation: sum requires at least one value",
		);
	}
	return rest.reduce<Decimal>(
		(acc, value) => acc.plus(value),
		new Decimal(first),
	);
});
