import { extendStatic } from "../utils/extend.ts";

// This static is intentionally NOT part of the core constructor: it belongs to
// the precision extension, and only extensions that need it (divide, sqrt,
// ln, ...) import this module.

declare module "dezi" {
	interface DecimalConstructor {
		/**
		 * Maximum number of significant digits kept by precision-based (inexact)
		 * operations such as division, roots and logarithms. Valid range is
		 * 1..1e9; validation is provided by a future `set()` extension, and
		 * direct assignment bypasses validation (mirroring decimal.js).
		 */
		precision: number;
	}
}

extendStatic("precision", 20);
