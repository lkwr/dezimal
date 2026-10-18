# ROADMAP

Goal: achieve operation parity with [decimal.js](https://mikemcl.github.io/decimal.js/), shipped as opt-in extensions grouped into presets.

Every operation is a small, tree-shakeable module under `src/ops/`, `src/check/`, `src/format/` or `src/config/`. Nothing is registered globally at import unless you opt in by importing an extension (or a preset that transitively imports them).

## Conventions

- **Folders** — extensions live in kind folders, decided by what they return or touch:
  - `src/ops/` — math operations: return **new Decimal values** (`plus`, `divide`, `sqrt`, `sin`, `max`, `floor`, …).
  - `src/check/` — questions about a value: booleans, comparisons, digit counts, guards (`equals`, `compare`, `isZero`, `decimalPlaces`, `sign`, `isDecimal`, …).
  - `src/format/` — output **representations** of the value (`toString`, `toFixed`, `toHex`, `toNumber`, `toFraction`, …).
  - `src/config/` — global calculation settings and value-less factories (`precision`, `rounding`, `set`, `clone`, `random`).
- **Extension** — one file per operation, implementing:
  - an instance method (`Decimal.prototype.<name>`), and — only for receiver-less operations (`max`, `min`, `sum`, `hypot`, `arctan2`, `sign`) and the short two-sided allowlist (`compare`) — a static method or constant (`Decimal.<name>`).
    Each side is declared type-wise with its own `interface Decimal` / `interface DecimalConstructor` section inside a single `declare module "dezi"` block, so importing the extension is what makes it typecheck everywhere.
- **Presets** — side-effect bundles in `src/preset/<name>.ts` that only import extensions. Extensions may belong to several presets (overlap is normal; registration is idempotent). Presets are exported as `./preset/<name>` subpaths.
- **Dependencies** — an extension that needs another extension's method calls it through a side-effect import (see `divide.ts` → `config/precision.ts`, `config/rounding-modes.ts`). Extensions never rely on methods that aren't imported or built in.
- **Priority legend** — `P0` immediate core (blocks release) · `P1` everyday usability · `P2` advanced but expected · `P3` niche/exotic.
- **Status** — ✅ shipped · ⬜ planned.
- **Table columns** — "dezi name" lists the method name(s) dezi plans to expose (primary + aliases); "decimal.js name" documents only what decimal.js calls it, for the parity audit.

## Invariants

These apply before anything else and are deliberate deviations from decimal.js:

- **No NaN, no ±Infinity.** Values are always finite. Parse stays strict (`Infinity`, `NaN`, non-numeric input throw at construction). Operations that would mathematically produce non-finite results **throw** instead of saturating:
  - `divide` by zero → `RangeError`
  - `sqrt` of a negative value → `RangeError`
  - `ln` / `log` of a non-positive value → `RangeError`
  - `arcsin` / `arccos` outside `[-1, 1]` → `RangeError`
  - `artanh` outside `(-1, 1)`, `arccosh` below `1` → `RangeError`
  - any result whose normalized exponent leaves `±Decimal.exponentLimit` (overflow **and** underflow, e.g. `times`, `pow`, `exp`, `divide`) → `RangeError`; checked centrally in parse/construction
  - `divide-integer` / `modulo` with zero divisor → `RangeError`
- **No negative zero.** Zero is always `[0n, 0]` (already guaranteed by normalization).
- **No implicit numeric coercion.** The core's `Symbol.toPrimitive` converts only in string contexts (template literals, `String(value)`); `a < b`, `a + b` and `+a` throw a `TypeError` instead of silently comparing or concatenating strings.
- **Parity delta:** decimal.js's `isNaN()` and `isFinite()` predicates are **excluded** — under the invariant above they'd be constants. `isNegative()`, `isPositive()`, `isZero()`, `isInteger()` are kept.

## Extensions by folder

Priority is per extension; the tables are the working checklist. The preset column curates bundles across folders.

### src/ops

#### Arithmetic

| Extension        | Sides | dezi name (aliases)                 | decimal.js name                                                           | Presets     | Priority | Status |
| ---------------- | ----- | ----------------------------------- | ------------------------------------------------------------------------- | ----------- | -------- | ------ |
| `plus`           | I     | `plus` (alias `add`)                | instance `plus` (alias `add`); dezi drops static `Decimal.add(x, y)`      | basic, full | P0       | ✅     |
| `minus`          | I     | `minus` (aliases `sub`, `subtract`) | instance `minus` (alias `sub`); dezi drops static `Decimal.sub(x, y)`     | basic, full | P0       | ✅     |
| `times`          | I     | `times` (aliases `mul`, `multiply`) | instance `times` (alias `mul`); dezi drops static `Decimal.mul(x, y)`     | basic, full | P0       | ✅     |
| `absolute`       | I     | `absolute` (alias `abs`)            | instance `absoluteValue` (alias `abs`); no static                         | basic, full | P0       | ✅     |
| `negate`         | I     | `negate`                            | instance `negated` (alias `neg`); no static                               | basic, full | P0       | ✅     |
| `divide`         | I     | `divide` (alias `div`)              | instance `dividedBy` (alias `div`); dezi drops static `Decimal.div(x, y)` | basic, full | P0       | ✅     |
| `divide-integer` | I     | `divideInteger` (alias `divToInt`)  | instance `dividedToIntegerBy` (alias `divToInt`); no static               | basic, full | P1       | ✅     |
| `modulo`         | I     | `modulo` (alias `mod`)              | instance `modulo` (alias `mod`); dezi drops static `Decimal.mod(x, y)`    | basic, full | P1       | ✅     |

Notes:

- `divide`, `sqrt`, `ln`, `log`, non-integer `pow`/`exp`, and trig/hyperbolic functions are **precision-based** (inexact beyond `Decimal.precision` significant digits, rounded with the rounding mode). Division by zero throws (see invariants).
- `times` can overflow the exponent limit when multiplying extreme values → must throw like `parse` does, not saturate.
- decimal.js also exposes static forms of the arithmetic ops (`Decimal.add(x, y)`, `Decimal.div(x, y)`, …); dezi deliberately drops them — statics are only for receiver-less operations and the `compare` allowlist (design note 5).

#### Aggregates

| Extension | Sides | dezi name (aliases) | decimal.js name                 | Presets     | Priority | Status                                      |
| --------- | ----- | ------------------- | ------------------------------- | ----------- | -------- | ------------------------------------------- |
| `sum`     | S     | `sum(...values)`    | static `Decimal.sum(x, y, ...)` | basic, full | P1       | ✅ (variadic; only the total is rounded)    |
| `max`     | S     | `max(...values)`    | static `Decimal.max(x, y, ...)` | basic, full | P1       | ✅ (exact, compare-based; empty args throw) |
| `min`     | S     | `min(...values)`    | static `Decimal.min(x, y, ...)` | basic, full | P1       | ✅                                          |

#### Quantization & range

| Extension               | Sides | dezi name (aliases)                              | decimal.js name                                                                      | Presets        | Priority | Status                                   |
| ----------------------- | ----- | ------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------- | -------- | ---------------------------------------- |
| `floor`                 | I     | `floor`                                          | instance `floor`; dezi drops static `Decimal.floor(x)`                               | rounding, full | P1       | ✅ (exact)                               |
| `ceil`                  | I     | `ceil`                                           | instance `ceil`; dezi drops static `Decimal.ceil(x)`                                 | rounding, full | P1       | ✅ (exact)                               |
| `truncate`              | I     | `truncate` (alias `trunc`)                       | instance `truncated` (alias `trunc`); dezi drops static `Decimal.trunc(x)`           | rounding, full | P1       | ✅ (exact)                               |
| `round`                 | I     | `round`                                          | instance `round()` (whole number, no args); dezi drops static `Decimal.round(x)`     | rounding, full | P1       | ✅ (exact)                               |
| `to-decimal-places`     | I     | `toDecimalPlaces(dp?, mode?)` (alias `toDP`)     | instance `toDecimalPlaces` (alias `toDP`); no static                                 | rounding, full | P1       | ✅ (omitted `dp` → unchanged value)      |
| `to-nearest`            | I     | `toNearest(x, rm?)`                              | instance `toNearest` (exact); no static                                              | rounding, full | P2       | ✅ (exact; quantize to multiples of `x`) |
| `to-significant-digits` | I     | `toSignificantDigits(sd?, mode?)` (alias `toSD`) | instance `toSignificantDigits` (alias `toSD`); no static                             | rounding, full | P2       | ✅ (omitted `sd` → unchanged value)      |
| `clamp`                 | I     | `clamp(min, max)`                                | instance `clampedTo` (alias `clamp`); dezi drops static `Decimal.clamp(x, min, max)` | rounding, full | P1       | ✅ (exact)                               |

#### Powers, roots & logarithms

| Extension | Sides | dezi name (aliases)                    | decimal.js name                                                                                                                        | Presets     | Priority | Status                                                                                                                     |
| --------- | ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `sqrt`    | I     | `sqrt`                                 | instance `squareRoot` (alias `sqrt`); dezi drops static `Decimal.sqrt(x)`                                                              | power, full | P1       | ✅ (correctly rounded)                                                                                                     |
| `pow`     | I     | `pow` (aliases `power`)                | instance `toPower` (alias `pow`); dezi drops static `Decimal.pow(base, exponent)`                                                      | power, full | P2       | ✅ (exponentiation by squaring; exact while the result fits working digits, rounded beyond; fractional via `exp(y·ln(x))`) |
| `cbrt`    | I     | `cbrt`                                 | instance `cubeRoot` (alias `cbrt`); dezi drops static `Decimal.cbrt(x)`                                                                | power, full | P2       | ✅ (correctly rounded, sign-preserving)                                                                                    |
| `exp`     | I     | `exp`                                  | instance `naturalExponential` (alias `exp`); dezi drops static `Decimal.exp(x)`                                                        | power, full | P2       | ✅ (reduction + Taylor; certain-overflow pre-check)                                                                        |
| `ln`      | I     | `ln`                                   | instance `naturalLogarithm` (alias `ln`); dezi drops static `Decimal.ln(x)`                                                            | power, full | P2       | ✅ (reduction + series; see design note 7)                                                                                 |
| `log`     | I     | `log(base?)` + statics `log2`, `log10` | instance `logarithm` (alias `log`; default base 10); dezi drops statics `Decimal.log(x, base?)`, `Decimal.log2(x)`, `Decimal.log10(x)` | power, full | P2       | ✅ (ln quotient at guard digits, rounded once; default base 10)                                                           |
| `hypot`   | S     | `hypot(...values)`                     | static `Decimal.hypot(x, y, ...)`                                                                                                      | power, full | P2       | ✅ (exact sum of squares, one correctly rounded root)                                                                      |

#### Trigonometric

All precision-based; domain violations throw (see invariants); arguments and results interpreted in **radians**.

| Extension | Sides | dezi name (aliases)       | decimal.js name                                                               | Presets             | Priority | Status                                                  |
| --------- | ----- | ------------------------- | ----------------------------------------------------------------------------- | ------------------- | -------- | ------------------------------------------------------- |
| `sin`     | I     | `sin`                     | instance `sine` (alias `sin`); dezi drops static `Decimal.sin(x)`             | trigonometric, full | P3       | ⬜                                                      |
| `cos`     | I     | `cos`                     | instance `cosine` (alias `cos`); dezi drops static `Decimal.cos(x)`           | trigonometric, full | P3       | ⬜                                                      |
| `tan`     | I     | `tan`                     | instance `tangent` (alias `tan`); dezi drops static `Decimal.tan(x)`          | trigonometric, full | P3       | ⬜                                                      |
| `arcsin`  | I     | `arcsin` (alias `asin`)   | instance `inverseSine` (alias `asin`); dezi drops static `Decimal.asin(x)`    | trigonometric, full | P3       | ⬜ (throws outside `[-1, 1]`)                           |
| `arccos`  | I     | `arccos` (alias `acos`)   | instance `inverseCosine` (alias `acos`); dezi drops static `Decimal.acos(x)`  | trigonometric, full | P3       | ⬜ (throws outside `[-1, 1]`)                           |
| `arctan`  | I     | `arctan` (alias `atan`)   | instance `inverseTangent` (alias `atan`); dezi drops static `Decimal.atan(x)` | trigonometric, full | P3       | ⬜                                                      |
| `arctan2` | S     | `arctan2` (alias `atan2`) | static only: `Decimal.atan2(y, x)`                                            | trigonometric, full | P3       | ⬜ (quadrant-correct; throws when both inputs are zero) |

#### Hyperbolic

All precision-based; domain violations throw.

| Extension | Sides | dezi name (aliases)       | decimal.js name                                                                           | Presets          | Priority | Status                        |
| --------- | ----- | ------------------------- | ----------------------------------------------------------------------------------------- | ---------------- | -------- | ----------------------------- |
| `sinh`    | I     | `sinh`                    | instance `hyperbolicSine` (alias `sinh`); dezi drops static `Decimal.sinh(x)`             | hyperbolic, full | P3       | ⬜                            |
| `cosh`    | I     | `cosh`                    | instance `hyperbolicCosine` (alias `cosh`); dezi drops static `Decimal.cosh(x)`           | hyperbolic, full | P3       | ⬜                            |
| `tanh`    | I     | `tanh`                    | instance `hyperbolicTangent` (alias `tanh`); dezi drops static `Decimal.tanh(x)`          | hyperbolic, full | P3       | ⬜                            |
| `arcsinh` | I     | `arcsinh` (alias `asinh`) | instance `inverseHyperbolicSine` (alias `asinh`); dezi drops static `Decimal.asinh(x)`    | hyperbolic, full | P3       | ⬜                            |
| `arccosh` | I     | `arccosh` (alias `acosh`) | instance `inverseHyperbolicCosine` (alias `acosh`); dezi drops static `Decimal.acosh(x)`  | hyperbolic, full | P3       | ⬜ (throws below `1`)         |
| `artanh`  | I     | `artanh` (alias `atanh`)  | instance `inverseHyperbolicTangent` (alias `atanh`); dezi drops static `Decimal.atanh(x)` | hyperbolic, full | P3       | ⬜ (throws outside `(-1, 1)`) |

### src/check

#### Comparison & predicates

| Extension               | Sides | dezi name (aliases)                                                 | decimal.js name                                | Presets                | Priority | Status                                                                         |
| ----------------------- | ----- | ------------------------------------------------------------------- | ---------------------------------------------- | ---------------------- | -------- | ------------------------------------------------------------------------------ |
| `compare`               | I + S | `compare`                                                           | instance `comparedTo` (alias `cmp`); no static | basic, predicate, full | P0       | ✅ (static side is dezi-native)                                                |
| `equals`                | I     | `equals` (alias `eq`)                                               | instance `equals` (alias `eq`)                 | predicate, full        | P1       | ✅ (via `compare == 0`)                                                        |
| `greater-than`          | I     | `greaterThan` (alias `gt`)                                          | instance `greaterThan` (alias `gt`)            | predicate, full        | P1       | ✅ (via `compare`)                                                             |
| `greater-than-or-equal` | I     | `greaterThanOrEqual` (alias `gte`; optional `greaterThanOrEqualTo`) | instance `greaterThanOrEqualTo` (alias `gte`)  | predicate, full        | P1       | ✅ (via `compare`)                                                             |
| `less-than`             | I     | `lessThan` (alias `lt`)                                             | instance `lessThan` (alias `lt`)               | predicate, full        | P1       | ✅ (via `compare`)                                                             |
| `less-than-or-equal`    | I     | `lessThanOrEqual` (alias `lte`; optional `lessThanOrEqualTo`)       | instance `lessThanOrEqualTo` (alias `lte`)     | predicate, full        | P1       | ✅ (via `compare`)                                                             |
| `sign`                  | S     | `sign(value)`                                                       | static `Decimal.sign(x)`                       | predicate, basic, full | P1       | ✅ (returns `1 / 0 / -1`; decimal.js also maps NaN/±0, which dezi has none of) |
| `is-nan` / `is-finite`  | —     | —                                                                   | instances `isNaN`, `isFinite`                  | —                      | —        | ❌ intentionally excluded (invariant)                                          |

#### Booleans

| Extension     | Sides | dezi name (aliases)          | decimal.js name                       | Presets         | Priority | Status                    |
| ------------- | ----- | ---------------------------- | ------------------------------------- | --------------- | -------- | ------------------------- |
| `is-zero`     | I     | `isZero`                     | instance `isZero`                     | predicate, full | P1       | ✅                        |
| `is-integer`  | I     | `isInteger` (alias `isInt`)  | instance `isInteger` (alias `isInt`)  | predicate, full | P1       | ✅ (`exponent >= 0`)      |
| `is-negative` | I     | `isNegative` (alias `isNeg`) | instance `isNegative` (alias `isNeg`) | predicate, full | P1       | ✅ (zero is not negative) |
| `is-positive` | I     | `isPositive` (alias `isPos`) | instance `isPositive` (alias `isPos`) | predicate, full | P1       | ✅ (zero is not positive) |
| `is-decimal`  | S     | `isDecimal(value)`           | static `Decimal.isDecimal(object)`    | predicate, full | P3       | ✅ (static type guard) |

#### Digit counts

| Extension            | Sides | dezi name (aliases)                | decimal.js name                                               | Presets                | Priority | Status                                                            |
| -------------------- | ----- | ---------------------------------- | ------------------------------------------------------------- | ---------------------- | -------- | ----------------------------------------------------------------- |
| `decimal-places`     | I     | `decimalPlaces()` (alias `dp`)     | instance `decimalPlaces` (alias `dp`); no static              | rounding, format, full | P2       | ✅ (number of digits after the point)                             |
| `significant-digits` | I     | `significantDigits()` (alias `sd`) | instance `precision([include_zeros])` (alias `sd`); no static | rounding, format, full | P2       | ✅ (parameter-less: normalized values never carry trailing zeros) |

### src/format

#### Strings & numbers

| Extension         | Sides | dezi name (aliases)              | decimal.js name                                                                                          | Presets                | Priority | Status                                    |
| ----------------- | ----- | -------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------- | -------- | ----------------------------------------- |
| `to-string`       | I     | `toString`                       | instance `toString`; no static                                                                           | format, basic, full    | P0       | ✅                                        |
| `to-plain-string` | I     | `toPlainString(fractionDigits?)` | — (always-plain form reached via `toFixed()`); no static                                                 | format, basic, full    | P0       | ✅                                        |
| `to-number`       | I     | `toNumber`                       | instance `toNumber`; no static                                                                           | format, full           | P1       | ✅ (precision loss documented)            |
| `to-fixed`        | I     | `toFixed(dp?, mode?)`            | instance `toFixed(dp?, rm?)`; no static                                                                  | rounding, format, full | P1       | ✅ (omitted `dp` → exact plain expansion) |
| `to-exponential`  | I     | `toExponential(dp?, rm?)`        | instance `toExponential(dp?, rm?)`; no static                                                            | format, full           | P2       | ✅ (reuses `utils/string.ts`)             |
| `to-precision`    | I     | `toPrecision(sd?, rm?)`          | instance `toPrecision(sd?, rm?)`; no static                                                              | format, full           | P2       | ✅                                        |
| `to-json`         | I     | `toJSON`                         | instance `toJSON` (= `valueOf`); no static                                                               | format, full           | P3       | ✅ (same string as `toString`) |
| `value-of`        | —     | — (core `Symbol.toPrimitive`)    | instance `valueOf` (like `toString` but keeps `−0`)                                                      | —                      | —        | ❌ replaced: the core converts in string contexts and throws on numeric/default coercion |
| `to-fraction`     | I     | `toFraction(maxDenominator?)`    | instance `toFraction(max_denominator?)` → `[Decimal, Decimal]`; dezi plans `[bigint, bigint]`; no static | format, full           | P3       | ⬜                                        |
| `to-big-int`      | I     | `toBigInt()`                     | — (dezi-native)                                                                                          | full                   | P3       | ✅ (throws for non-integers)              |

#### Base-radix output

| Extension        | Sides | dezi name (aliases)                       | decimal.js name                                     | Presets     | Priority | Status |
| ---------------- | ----- | ----------------------------------------- | --------------------------------------------------- | ----------- | -------- | ------ |
| `to-binary`      | I     | `toBinary(sd?, rm?)`                      | instance `toBinary(sd?, rm?)`; no static            | bases, full | P3       | ⬜     |
| `to-octal`       | I     | `toOctal(sd?, rm?)`                       | instance `toOctal(sd?, rm?)`; no static             | bases, full | P3       | ⬜     |
| `to-hexadecimal` | I     | `toHexadecimal(sd?, rm?)` (alias `toHex`) | instance `toHexadecimal` (alias `toHex`); no static | bases, full | P3       | ⬜     |

Input side: decimal.js's constructor also parses `0x`/`0b`/`0o` strings (with `p` binary exponents). dezi's strict-decimal-string invariant means radix input either arrives as a dedicated parsing extension (`src/parse/` would be a new kind folder) or is rejected — open decision, P3.

### src/config

| Extension      | Sides | dezi name (aliases)                                     | decimal.js name                                                                        | Presets      | Priority | Status                                                           |
| -------------- | ----- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------ | -------- | ---------------------------------------------------------------- |
| rounding modes | S     | `rounding: RoundingMode` + exported `type RoundingMode` | `ROUND_UP` … `ROUND_HALF_FLOOR` constants + `rounding` config (`EUCLID` is not a mode) | config, full | P0       | ✅ (dezi replaces the numeric constants with a string union)     |
| `precision`    | S     | `precision`                                             | `precision` config (1..1e9)                                                            | config, full | P0       | ✅ (needed by `divide`)                                          |
| `ln10`         | S     | `ln10`                                                  | static `LN10` (a Decimal value; internal range checks)                                 | config, full | P2       | ✅ (overrideable like `precision`)                               |
| `set`          | S     | `set(props)`                                            | static `Decimal.set(object)`                                                           | config, full | P3       | ⬜ (validates and assigns config, `defaults: true` support)      |
| `clone`        | S     | `clone(props?)`                                         | static `Decimal.clone(object)`                                                         | config, full | P3       | ⬜ (open design question — note 3)                               |
| `random`       | S     | `random(dp?)`                                           | static `Decimal.random(dp?)`                                                           | config, full | P3       | ⬜ (`dp` defaults to `precision`; `crypto`-source decision note) |

The rounding modes: `RoundingMode = "up" | "down" | "ceil" | "floor" | "half-up" | "half-down" | "half-even" | "half-ceil" | "half-floor"`, default `"half-up"`.

## Presets

| Preset          | Contents                                                      | Priority |
| --------------- | ------------------------------------------------------------- | -------- |
| `full` ✅       | every extension (already exists)                              | P0       |
| `basic` ✅      | arithmetic + `compare` + `max`/`min` + basic format           | P0       |
| `predicate` ✅  | comparison sugar + booleans + `sign`                          | P1       |
| `rounding` ✅   | quantization family + modes                                   | P1       |
| `format` ✅     | string/number conversions                                     | P1       |
| `power` ✅      | roots, powers, exp/log family                                 | P2       |
| `trigonometric` | trig + inverse trig                                           | P3       |
| `hyperbolic`    | hyperbolic + inverse                                          | P3       |
| `bases`         | binary/octal/hexadecimal conversion                           | P3       |
| `config` ✅     | config statics (modes, `precision`, `set`, `clone`, `random`) | P3       |

The presets marked ✅ exist in `src/preset/` and build to `dist/preset/*`; `trigonometric`, `hyperbolic` and `bases` are created together with their first extension (no empty placeholder files are published).

Presets ship as `./preset/<name>` subpaths; each lists only side-effect imports so consumers can still import single extensions instead (`./ops/plus`, `./check/compare`, `./format/to-string`, `./config/precision`, …).

## Design notes

1. **Exact vs precision-based operations.** decimal.js rounds to `precision` in every operation except `absoluteValue`, `ceil`, `floor`, `negated`, `round`, `toDecimalPlaces`, `toNearest` and `truncated`. dezi deliberately diverges for the additive/multiplicative family: `plus`, `minus`, `times`, `absolute`, `negate`, `sum` and `modulo` (on exact operands) stay fully exact — bigints carry arbitrary precision. Division and transcendental functions are inherently inexact; they round to `Decimal.precision` significant digits using the configured rounding mode. Docs must call out per-extension whether it is exact or precision-based.
2. **Configuration surface mapping (decimal.js → dezi).**
   - `precision` → `Decimal.precision` ✅ (config extension; needed by `divide`)
   - `rounding` → `Decimal.rounding: RoundingMode` ✅ (string union instead of numeric constants; needed by the whole rounding/format family)
   - `minE` / `maxE` → `Decimal.exponentLimit` (dezi-native, single symmetric limit) ✅
   - `toExpNeg` / `toExpPos` (exponential-notation thresholds) → `Decimal.minPlainExponent` / `Decimal.maxPlainExponent` (owned by the `to-string` extension) ✅
   - `LN10` (internal 1025-digit constant) → `Decimal.ln10` (overrideable config static; feeds range checks, not result rounding) ✅
   - `modulo` (mode used by modulo division — decimal.js's EUCLID slot) → ⬜ P3
   - `crypto` (entropy source for `random`) → ⬜ P3
   - `noConflict()` → excluded (UMD-era global cleanup, meaningless for ESM)
3. **`Decimal.clone()` design question.** decimal.js `clone(props)` returns a whole new constructor class with its own configuration. dezi has a single class with mutable statics, and covers the main use case — code that must not depend on (or leak into) the global configuration — with per-call `PrecisionOptions` (`x.divide(y, { precision: 50, rounding: "half-even" })`) on every precision-based op. `clone` is therefore likely to be skipped; revisit only on concrete demand.
4. **Naming & alias policy.** dezi picks its own consistent verb-style names instead of inheriting decimal.js's mixed scheme (short operator names `plus`/`minus`/`times`, participles like `dividedBy`, descriptives like `squareRoot`/`toPower`). Rules: primaries are short verbs (`divide`, `pow`, `sqrt`, `negate`), boolean predicates drop decimal.js's trailing `To` (`lessThanOrEqual`, not `lessThanOrEqualTo`), and aliases are shorter equivalents without filler words (`div`, `sub`, `gt`). decimal.js names stay in the tables only as parity-audit references; conversion methods keep the JS-native `to*` family (`toString`, `toFixed`, …).
5. **Static surface policy.** Statics are the exception, not the rule: they exist only for operations that have no instance receiver (aggregators `max`, `min`, `sum`, `hypot` and `arctan2` ship static-only, like decimal.js) and for a small two-sided allowlist (`compare`, which set the precedent). dezi does **not** provide static mirrors of instance operations — decimal.js's `Decimal.add(x, y)`-style surface is a deliberate parity delta; the instance method is the API.
6. **Instance property surface.** decimal.js instances expose internal fields `d`/`e`/`s` (digits array, exponent, sign, all best treated read-only). dezi instances expose `coefficient`, `exponent` and `raw`, which cover the same information; `d`/`e`/`s` aliases are not planned.
7. **Transcendental digit limits.** decimal.js's internal `LN10` and `PI` constants carry 1025 digits, so `ln`/trig results are only correctly rounded up to roughly 1000 digits (max result precision ≈ 1000 − argument precision for trig). dezi's `ln`/`exp` compute from reduction + series at working precision, so no constant-imposed ceiling applies; the `ln10` config static feeds only the range checks. Trig (P3) will inherit decimal.js's `PI`-style constraints; document as footnotes rather than behavior differences.
8. **Every extension ships with:** its `declare module "dezi"` augmentation (one block per file, containing both interfaces and any exported types), `extend()`/`extendStatic()` registration, side-effect imports of dependencies, unit tests, and no new folders beyond `src/ops/`, `src/check/`, `src/format/`, `src/config/`, `src/preset/`, and `test/` mirrors (`src/parse/` may join if radix input lands).

## Milestones

- **v0.1 — Arithmetic core complete (P0).** ✅ Rounding modes + `precision`, `divide`, plus presets scaffolded; README documents exact vs precision-based ops.
- **v0.2 — Everyday usability (P1).** ✅ Quantization family (`floor`/`ceil`/`truncate`/`round`/`to-decimal-places`/`clamp`), `to-fixed`/`to-number`, comparison sugar + booleans + `sign`, `max`/`min`/`sum`, `sqrt`; `predicate`/`rounding`/`format` presets filled (only `to-nearest` deferred to P2).
- **v0.3 — Advanced math (P2).** ✅ `pow`, `cbrt`, `exp`, `ln`, `log`, `hypot`, `to-nearest`, `to-significant-digits`, digit counts (`decimal-places`, `significant-digits`), `to-exponential`/`to-precision`; `power` preset filled; `ln10` config static.
- **v0.4 — Transcendental completeness (P3).** Trigonometric + hyperbolic families; `trigonometric`/`hyperbolic` presets.
- **v0.5 — Configuration & parity audit (P3).** `config` extensions (`set`, `clone` decision, `random` + entropy source), base-radix conversions, `to-fraction`/`to-json`/`value-of`, and a full parity audit against the decimal.js method list.

---

Status: 51 of 71 planned extension modules shipped, grouped into 7 presets.
