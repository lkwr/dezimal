import type { Decimal } from "../decimal.ts";
import { extend } from "../utils/extend.ts";

// required extensions
import "./to-string.ts";

declare module "dezimal" {
	interface Decimal {
		/**
		 * Returns the same string as `toString()`, so `JSON.stringify`
		 * serializes values as lossless strings. Parse them back with
		 * `new Decimal(string)`.
		 */
		toJSON(): string;
	}
}

extend("toJSON", function toJSON(this: Decimal): string {
	return this.toString();
});
