import type { RoundingMode } from "dezi";
import { Decimal } from "../decimal.ts";

// required extensions
import "../config/precision.ts";
import "../config/rounding-modes.ts";

/**
 * Resolves the precision of a precision-based operation: the per-call
 * override, else `Decimal.precision`. Both are user input, so the result is
 * checked here, once per operation.
 */
export const currentPrecision = (
	precision: number = Decimal.precision,
): number => {
	if (!Number.isSafeInteger(precision) || precision < 1) {
		throw new RangeError(
			`Invalid Decimal precision: expected a positive integer, got ${precision}`,
		);
	}
	return precision;
};

// A record (not a list) so the compiler enforces exactly the union's members.
const ROUNDING_MODES: Record<RoundingMode, true> = {
	up: true,
	down: true,
	ceil: true,
	floor: true,
	"half-up": true,
	"half-down": true,
	"half-even": true,
	"half-ceil": true,
	"half-floor": true,
};

/**
 * Resolves the rounding mode of an operation: the per-call override, else
 * `Decimal.rounding`, checked like `currentPrecision`.
 */
export const currentRounding = (
	mode: RoundingMode = Decimal.rounding,
): RoundingMode => {
	if (!Object.hasOwn(ROUNDING_MODES, mode)) {
		throw new RangeError(`Invalid Decimal rounding mode: ${mode}`);
	}
	return mode;
};
