import { Decimal } from "./src/decimal.ts";

import "./src/ops/plus.ts";

declare module "dezi" {
	interface DecimalConstructor {
		myValue: string;
	}
}

Decimal.myValue = "1000";

console.log(Decimal.prototype);
