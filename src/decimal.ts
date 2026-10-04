import { normalize } from "./utils/common.ts";
import { parse } from "./utils/parse.ts";

export type RawDecimal = [coefficient: bigint, exponent: number];

/**
 * Instance side of `Decimal`. Ops augment this interface via
 * `declare module "dezi"` to add their methods type-wise.
 */
export interface Decimal {
	readonly coefficient: bigint;
	readonly exponent: number;
	readonly raw: RawDecimal;
	readonly [Symbol.toStringTag]: string;
}

export type DecimalLike = string | number | bigint | Decimal | RawDecimal;

export interface DecimalConstructor {
	exponentLimit: number;

	readonly prototype: Decimal;
	new (decimal: DecimalLike): Decimal;
}

class DecimalImpl {
	static name = "Decimal";
	static exponentLimit = 999_999;

	readonly coefficient: bigint;
	readonly exponent: number;

	constructor(decimal: DecimalLike) {
		[this.coefficient, this.exponent] = normalize(parse(decimal));
	}

	get raw(): RawDecimal {
		return [this.coefficient, this.exponent];
	}

	get [Symbol.toStringTag]() {
		return "Decimal";
	}
}

// Ops and statics are attached dynamically via extend()/extendStatic(), and
// the interface augmentations on `Decimal`/`DecimalConstructor` are what makes
// them visible type-wise. That dynamic attachment is not provable statically,
// hence the unchecked conversion at this single boundary.
export const Decimal = DecimalImpl as unknown as DecimalConstructor;
