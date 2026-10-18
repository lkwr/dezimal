import { extendStatic } from "../utils/extend.ts";

// This static is intentionally NOT part of the core constructor: it belongs to
// the precision extension, and only extensions that need it (divide, sqrt,
// ln, ...) import this module.

// required extensions
import "./rounding-modes.ts";

declare module "dezimal" {
	/**
	 * Per-call overrides for precision-based operations, e.g.
	 * `x.divide(3, { precision: 50 })`. Omitted fields fall back to
	 * `Decimal.precision` and `Decimal.rounding`.
	 */
	export type PrecisionOptions = {
		/** Significant digits of the result, a positive integer. */
		precision?: number;
		/** Rounding mode applied to the result. */
		rounding?: RoundingMode;
	};

	interface DecimalConstructor {
		/**
		 * Default number of significant digits kept by precision-based
		 * (inexact) operations such as division, roots and logarithms. Must be
		 * a positive integer; operations throw a RangeError otherwise.
		 * Default: 20.
		 */
		precision: number;
	}
}

extendStatic("precision", 20);
