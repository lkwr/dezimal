// biome-ignore-all lint/suspicious/noExplicitAny: required
import { Decimal, type DecimalConstructor } from "../decimal.ts";

type Aliases<T, V> = Extract<
	{
		[K in keyof T]-?: T[K] extends V ? K : never;
	}[keyof T],
	string
>;

export const extend = <TProp extends Extract<keyof Decimal, string>>(
	property: TProp,
	value: Decimal[TProp],
	aliases?: Aliases<Decimal, Decimal[TProp]>[],
) => {
	Decimal.prototype[property] = value;
	aliases?.forEach((alias) => void extend<any>(alias, value));
};

export const extendStatic = <
	TProp extends Extract<keyof DecimalConstructor, string>,
>(
	property: TProp,
	value: DecimalConstructor[TProp],
	aliases?: Aliases<DecimalConstructor, DecimalConstructor[TProp]>[],
) => {
	Decimal[property] = value;
	aliases?.forEach((alias) => void extendStatic<any>(alias, value));
};
