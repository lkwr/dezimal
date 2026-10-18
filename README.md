# dezi

Arbitrary-precision decimal arithmetic for JavaScript and TypeScript: a sub-1 kB core and an opt-in extension for every operation.

_dezi_ is short for _Dezimal_, German for decimal.

```ts
import { Decimal } from "dezi";
import "dezi/preset/basic";

new Decimal("0.1").plus("0.2").toString(); // "0.3"
```

- **Pay for what you use.** The core only parses and stores values (0.9 kB min+gzip). Operations are extensions you import individually or as presets; everything together is about 5 kB.
- **Types follow your imports.** Importing an extension adds its methods to the `Decimal` type, so calling something you did not import is a compile error, not a runtime surprise.
- **Exact where possible.** Addition, subtraction, multiplication and rounding to a scale are exact (bigint based) and never lose digits. Only operations that cannot be exact, such as division, roots and logarithms, round to a configurable precision, and those results are correctly rounded.
- **No `NaN`, no `Infinity`, no `-0`.** Every value is a finite decimal. Invalid operations throw instead of producing special values.
- **Fast.** On typical inputs most operations run 1.5–5× faster than decimal.js (see [Performance](#performance)).

## Install

```sh
npm install dezi
```

dezi ships as ES modules and relies on `bigint` (ES2020).

## Usage

Import the core once and the extensions you need as side-effect imports, usually in your entry file:

```ts
import { Decimal } from "dezi";
import "dezi/preset/basic"; // arithmetic, compare, max/min/sum, toString
import "dezi/ops/sqrt"; // single extensions work too

const price = new Decimal("19.99");
const total = price.times(3).plus("4.95");

total.toString(); // "64.92"
total.sqrt({ precision: 8 }).toString(); // "8.0572948"
```

Values are immutable; every operation returns a new `Decimal`. Every argument accepts a `DecimalLike`: a `Decimal`, a string, a number, a bigint, or a raw `[coefficient, exponent]` tuple.

```ts
new Decimal("1.50"); // 1.5 — values are normalized
new Decimal("-1.2e-5");
new Decimal(0.1); // 0.1 — numbers are read via their shortest string form
new Decimal(123n);
new Decimal([12345n, -2]); // 123.45
```

### Presets

| Import | Contents |
| --- | --- |
| `dezi/preset/basic` | `plus`, `minus`, `times`, `divide`, `divideInteger`, `modulo`, `absolute`, `negate`, `compare`, `sign`, `max`, `min`, `sum`, `toString`, `toPlainString` |
| `dezi/preset/predicate` | `equals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `isZero`, `isInteger`, `isNegative`, `isPositive`, `compare`, `sign` |
| `dezi/preset/rounding` | `round`, `floor`, `ceil`, `truncate`, `toDecimalPlaces`, `toSignificantDigits`, `toNearest`, `clamp`, `toFixed`, `decimalPlaces`, `significantDigits` |
| `dezi/preset/power` | `sqrt`, `cbrt`, `pow`, `exp`, `ln`, `log` (+ `Decimal.log2`, `Decimal.log10`), `Decimal.hypot` |
| `dezi/preset/format` | `toString`, `toPlainString`, `toFixed`, `toExponential`, `toPrecision`, `toNumber`, `decimalPlaces`, `significantDigits` |
| `dezi/preset/config` | `Decimal.precision`, `Decimal.rounding`, `Decimal.ln10` |
| `dezi/preset/full` | everything |

Every extension is also available on its own as `dezi/<kind>/<name>`, for example `dezi/ops/divide`, `dezi/check/is-zero` or `dezi/format/to-fixed`:

| Kind | Extensions |
| --- | --- |
| `dezi/ops/*` | `plus`, `minus`, `times`, `divide`, `divide-integer`, `modulo`, `absolute`, `negate`, `sum`, `max`, `min`, `round`, `floor`, `ceil`, `truncate`, `to-decimal-places`, `to-significant-digits`, `to-nearest`, `clamp`, `sqrt`, `cbrt`, `pow`, `exp`, `ln`, `log`, `hypot` |
| `dezi/check/*` | `compare`, `equals`, `greater-than`, `greater-than-or-equal`, `less-than`, `less-than-or-equal`, `sign`, `is-zero`, `is-integer`, `is-negative`, `is-positive`, `is-decimal`, `decimal-places`, `significant-digits` |
| `dezi/format/*` | `to-string`, `to-plain-string`, `to-fixed`, `to-exponential`, `to-precision`, `to-number`, `to-big-int`, `to-json` |
| `dezi/config/*` | `precision`, `rounding-modes`, `ln10` |

Extensions register themselves on import and pull in what they depend on. Importing the same extension from several places is harmless.

Many operations have short aliases: `add`, `sub`, `mul`, `div`, `mod`, `abs`, `eq`, `gt`, `gte`, `lt`, `lte`, `toDP`, `toSD`, and more.

## Precision and rounding

The arithmetic family (`plus`, `minus`, `times`, `modulo`, `sum`, …) and the quantization family (`round`, `toDecimalPlaces`, `toNearest`, …) are exact: they keep every digit or round to the scale you ask for.

Operations whose results generally have infinitely many digits (`divide`, `divideInteger`, `sqrt`, `cbrt`, `pow`, `exp`, `ln`, `log`, `hypot`) round to `Decimal.precision` significant digits (default `20`) using `Decimal.rounding` (default `"half-up"`):

```ts
new Decimal(1).divide(3).toString(); // "0.33333333333333333333"

Decimal.precision = 10;
Decimal.rounding = "half-even";
new Decimal(2).divide(3).toString(); // "0.6666666667"
```

Each of these operations also takes per-call options. This lets library code stay independent of the global configuration:

```ts
new Decimal(1).divide(3, { precision: 5 }).toString(); // "0.33333"
new Decimal(2).sqrt({ precision: 50, rounding: "down" });
new Decimal(2).log(10, { precision: 5 }); // log10(2) → 0.30103
```

Results are correctly rounded: computed with guard digits and rounded once, and exactly representable results stay exact (`Decimal.log2(8)` is `3`, and `new Decimal(4).pow("0.5")` is `2`).

Rounding modes:

| Mode | Rounds towards |
| --- | --- |
| `"up"` / `"down"` | away from zero / towards zero |
| `"ceil"` / `"floor"` | +∞ / −∞ |
| `"half-up"` / `"half-down"` | nearest; ties away from / towards zero |
| `"half-even"` | nearest; ties to the even neighbour (banker's rounding) |
| `"half-ceil"` / `"half-floor"` | nearest; ties towards +∞ / −∞ |

Quantization and formatting methods take an explicit mode as well:

```ts
new Decimal("0.125").toDecimalPlaces(2).toString(); // "0.13"
new Decimal("0.125").toDecimalPlaces(2, "half-even").toString(); // "0.12"
new Decimal("19.999").toFixed(2); // "20.00"
```

## Values and errors

- **Finite only.** `"NaN"`, `"Infinity"` and malformed input throw a `TypeError` or `RangeError` at construction. Division by zero, `sqrt` of a negative value, `ln` of a non-positive value and similar operations throw a `RangeError`.
- **Bounded exponent.** Values and results must stay within `±Decimal.exponentLimit` (999 999) in exponent. Leaving that range throws a `RangeError` in both directions: very small results do not silently become zero.
- **Normalized.** Trailing zeros are dropped (`"1.50"` is stored as `1.5`) and zero is always plain `0`.
- **No implicit number coercion.** Template literals and `String(value)` use `toString()`, but `a < b`, `a + b` and `+a` throw a `TypeError` instead of silently comparing or concatenating strings. Use `compare`/`lessThan`/`plus` and `toNumber()` instead.
- **JSON.** With `dezi/format/to-json`, `JSON.stringify` writes values as lossless strings. Read them back with `new Decimal(string)`.

```ts
JSON.stringify({ price: new Decimal("19.99") }); // '{"price":"19.99"}'
new Decimal("1.5e3").toBigInt(); // 1500n
```

## Coming from decimal.js

dezi covers the commonly used decimal.js API with a few deliberate differences:

- Operations are opt-in imports instead of all built in.
- `plus`, `minus`, `times`, `modulo` and `sum` are exact instead of rounded to `precision`.
- There are no `NaN`, `±Infinity` or `-0` values, so no `isNaN`/`isFinite`. Invalid operations throw, and so do results beyond the exponent range in either direction.
- Names are verbs with short aliases: `divide`/`div` instead of `dividedBy`, and `lessThanOrEqual`/`lte` instead of `lessThanOrEqualTo`.
- Rounding modes are strings (`"half-even"`) instead of numeric constants.
- Precision-based operations accept per-call `{ precision, rounding }` options instead of requiring `Decimal.clone()`.

Not yet available: trigonometric and hyperbolic functions, base-2/8/16 conversion, `toFraction` and `random`. See [ROADMAP.md](./ROADMAP.md).

## Size and performance

Bundle size (min+gzip, including the core):

| Import | Size |
| --- | --- |
| core only | 0.9 kB |
| `preset/basic` | 2.5 kB |
| `preset/full` | 5.0 kB |

Throughput relative to decimal.js 10.6 on Node 26 (higher is better; plain Node script, typical 3–6 digit operands, default precision 20):

| Operation | dezi vs decimal.js |
| --- | --- |
| parse | 1.7× |
| `plus` / `minus` / `times` | 2.2× / 2.2× / 3.9× |
| `divide` | 1.6× |
| `compare` / `toString` | 1.1× / 1.0× |
| `sqrt` | 5.6× |
| `exp` / `ln` | 4.2× / 1.8× |
| `pow` (fractional / integer) | 2.3× / 1.1× |

## License

[MIT](./LICENSE)
