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
	/**
	 * Converts to a string in string contexts (template literals,
	 * `String(value)`) via `toString()`. Numeric and default coercion throw a
	 * TypeError, so `a < b` or `a + b` fail loudly instead of silently
	 * comparing or concatenating strings; use the explicit operations or
	 * `toNumber()`.
	 */
	[Symbol.toPrimitive](hint: string): string;
}

export type DecimalLike = string | number | bigint | Decimal | RawDecimal;

export interface DecimalConstructor {
	/**
	 * Largest magnitude of a normalized exponent. Constructing a value or
	 * computing a result beyond `±exponentLimit` throws a RangeError.
	 */
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
		[this.coefficient, this.exponent] = parse(decimal);
	}

	get raw(): RawDecimal {
		return [this.coefficient, this.exponent];
	}

	get [Symbol.toStringTag]() {
		return "Decimal";
	}

	[Symbol.toPrimitive](hint: string): string {
		if (hint === "string") {
			return this.toString();
		}
		throw new TypeError(
			`Cannot convert a Decimal to a ${hint} primitive: use explicit operations, toString() or toNumber()`,
		);
	}
}

// Ops and statics are attached dynamically via extend()/extendStatic(), and
// the interface augmentations on `Decimal`/`DecimalConstructor` are what makes
// them visible type-wise. That dynamic attachment is not provable statically,
// hence the unchecked conversion at this single boundary.
export const Decimal = DecimalImpl as unknown as DecimalConstructor;
