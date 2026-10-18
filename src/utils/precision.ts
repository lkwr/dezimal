import { Decimal } from "../decimal.ts";

// required extensions
import "../config/precision.ts";

/**
 * Reads `Decimal.precision` for a precision-based operation. The static is
 * user-mutable without validation until a `set()` extension, so it is
 * checked here, once per operation.
 */
export const currentPrecision = (): number => {
	const precision = Decimal.precision;
	if (!Number.isSafeInteger(precision) || precision < 1) {
		throw new RangeError(
			`Invalid Decimal precision: expected a positive integer, got ${precision}`,
		);
	}
	return precision;
};
