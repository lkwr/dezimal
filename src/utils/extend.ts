import { Decimal, type DecimalConstructor } from "../decimal.ts";

/** Keys of `T` whose type accepts a value of type `V`. */
type Aliases<T, V> = Extract<
	{
		[K in keyof T]-?: V extends T[K] ? K : never;
	}[keyof T],
	string
>;

/**
 * Registers an instance method (plus aliases) on `Decimal.prototype`.
 * Methods are non-enumerable, like methods declared in a class body.
 */
export const extend = <TProp extends Extract<keyof Decimal, string>>(
	property: TProp,
	value: Decimal[TProp],
	aliases: Aliases<Decimal, Decimal[TProp]>[] = [],
): void => {
	for (const name of [property, ...aliases]) {
		Object.defineProperty(Decimal.prototype, name, {
			value,
			writable: true,
			configurable: true,
		});
	}
};

/**
 * Registers a static method or config value (plus aliases) on the
 * `Decimal` constructor. Statics stay enumerable and writable, like
 * `static` class fields.
 */
export const extendStatic = <
	TProp extends Extract<keyof DecimalConstructor, string>,
>(
	property: TProp,
	value: DecimalConstructor[TProp],
	aliases: Aliases<DecimalConstructor, DecimalConstructor[TProp]>[] = [],
): void => {
	for (const name of [property, ...aliases]) {
		Object.defineProperty(Decimal, name, {
			value,
			writable: true,
			enumerable: true,
			configurable: true,
		});
	}
};
