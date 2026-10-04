import { Decimal } from "./src/index.ts";

import "./src/extensions/plus.ts";

declare module "dezi" {
	interface DecimalConstructor {
		myValue: string;
	}
}

Decimal.myValue = "1000";

console.log(Decimal.prototype);
