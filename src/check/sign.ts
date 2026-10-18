import type { DecimalLike } from "../decimal.ts";
import { extendStatic } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezimal" {
	interface DecimalConstructor {
		/**
		 * Returns 1 for a positive value, -1 for a negative value, 0 for zero.
		 */
		sign(value: DecimalLike): 1 | 0 | -1;
	}
}

extendStatic("sign", function sign(value: DecimalLike): 1 | 0 | -1 {
	const [coefficient] = parse(value);
	return coefficient < 0n ? -1 : coefficient > 0n ? 1 : 0;
});
