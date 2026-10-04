import type { DecimalLike } from "../decimal.ts";
import { normalize } from "../utils/common.ts";
import { extendStatic } from "../utils/extend.ts";
import { parse } from "../utils/parse.ts";

declare module "dezi" {
	interface DecimalConstructor {
		/**
		 * Returns 1 for a positive value, -1 for a negative value, 0 for zero.
		 */
		sign(value: DecimalLike): 1 | 0 | -1;
	}
}

extendStatic("sign", function sign(value: DecimalLike): 1 | 0 | -1 {
	const [coefficient] = normalize(parse(value));
	return coefficient < 0n ? -1 : coefficient > 0n ? 1 : 0;
});
