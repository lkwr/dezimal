# ROADMAP

Goal: achieve operation parity with [decimal.js](https://mikemcl.github.io/decimal.js/), shipped as opt-in extensions grouped into presets.

Every operation is a small, tree-shakeable module in `src/extensions/`. Nothing is registered globally at import unless you opt in by importing an extension (or a preset that transitively imports them).

## Conventions

- **Extension** — one file per operation in `src/extensions/<name>.ts`, implementing:
  - an instance method (`Decimal.prototype.<name>`), and/or
  - a static method or constant (`Decimal.<name>`).
    Each side is declared type-wise with its own `declare module "dezi"` block (`interface Decimal` / `interface DecimalConstructor`), so importing the extension is what makes it typecheck everywhere.
- **Presets** — side-effect bundles in `src/preset/<name>.ts` that only import extensions. Extensions may belong to several presets (overlap is normal; registration is idempotent). Presets are exported as `./preset/<name>` subpaths.
- **Dependencies** — an extension that needs another extension's method calls it through a side-effect import (see `minus.ts` → `plus.ts`, `negate.ts`). Extensions never rely on methods that aren't imported or built in.
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
  - `pow` / `exp` overflowing `Decimal.exponentLimit` → `RangeError`
  - `divide-integer` / `modulo` with zero divisor → `RangeError`
- **No negative zero.** Zero is always `[0n, 0]` (already guaranteed by normalization).
- **Parity delta:** decimal.js's `isNaN()` and `isFinite()` predicates are **excluded** — under the invariant above they'd be constants. `isNegative()`, `isPositive()`, `isZero()`, `isInteger()` are kept.

## Extensions by family

Priority is per extension; the family tables are the working checklist.

### Arithmetic

| Extension        | Sides | dezi name (aliases)                 | decimal.js name                                                | Presets     | Priority | Status                                    |
| ---------------- | ----- | ----------------------------------- | -------------------------------------------------------------- | ----------- | -------- | ----------------------------------------- |
| `plus`           | I + S | `plus` (alias `add`)                | instance `plus` (alias `add`); static `Decimal.add(x, y)`      | basic, full | P0       | ✅ (static mirror ⬜)                     |
| `minus`          | I + S | `minus` (aliases `sub`, `subtract`) | instance `minus` (alias `sub`); static `Decimal.sub(x, y)`     | basic, full | P0       | ✅ (requires `plus`, `negate`; mirror ⬜) |
| `times`          | I + S | `times` (aliases `mul`, `multiply`) | instance `times` (alias `mul`); static `Decimal.mul(x, y)`     | basic, full | P0       | ✅ (static mirror ⬜)                     |
| `absolute`       | I     | `absolute` (alias `abs`)            | instance `absoluteValue` (alias `abs`); no static              | basic, full | P0       | ✅                                        |
| `negate`         | I     | `negate`                            | instance `negated` (alias `neg`); no static                    | basic, full | P0       | ✅                                        |
| `divide`         | I + S | `divide` (alias `div`)              | instance `dividedBy` (alias `div`); static `Decimal.div(x, y)` | basic, full | P0       | ⬜                                        |
| `divide-integer` | I     | `divideInteger` (alias `divToInt`)  | instance `dividedToIntegerBy` (alias `divToInt`); no static    | basic, full | P1       | ⬜                                        |
| `modulo`         | I + S | `modulo` (alias `mod`)              | instance `modulo` (alias `mod`); static `Decimal.mod(x, y)`    | basic, full | P1       | ⬜                                        |
| `sum`            | S     | `sum(x, y, ...)`                    | static `Decimal.sum(x, y, ...)`                                | basic, full | P1       | ⬜ (variadic; only the total is rounded)  |

Notes:

- `divide`, `sqrt`, `ln`, `log`, non-integer `pow`/`exp`, and trig/hyperbolic functions are **precision-based** (inexact beyond `Decimal.precision` significant digits, rounded with the rounding mode). Division by zero throws (see invariants).
- `times` can overflow the exponent limit when multiplying extreme values → must throw like `parse` does, not saturate.
- decimal.js has no statics for `absoluteValue`/`negated`/`dividedToIntegerBy`; dezi follows that (see design note 5 for the mirror naming rule).

### Comparison & predicates

| Extension               | Sides | dezi name (aliases)                                                 | decimal.js name                                | Presets                | Priority | Status                                                                         |
| ----------------------- | ----- | ------------------------------------------------------------------- | ---------------------------------------------- | ---------------------- | -------- | ------------------------------------------------------------------------------ |
| `compare`               | I + S | `compare`                                                           | instance `comparedTo` (alias `cmp`); no static | basic, predicate, full | P0       | ✅ (static side is dezi-native)                                                |
| `equals`                | I     | `equals` (alias `eq`)                                               | instance `equals` (alias `eq`)                 | predicate, full        | P1       | ⬜ (via `compare == 0`)                                                        |
| `greater-than`          | I     | `greaterThan` (alias `gt`)                                          | instance `greaterThan` (alias `gt`)            | predicate, full        | P1       | ⬜ (via `compare`)                                                             |
| `greater-than-or-equal` | I     | `greaterThanOrEqual` (alias `gte`; optional `greaterThanOrEqualTo`) | instance `greaterThanOrEqualTo` (alias `gte`)  | predicate, full        | P1       | ⬜ (via `compare`)                                                             |
| `less-than`             | I     | `lessThan` (alias `lt`)                                             | instance `lessThan` (alias `lt`)               | predicate, full        | P1       | ⬜ (via `compare`)                                                             |
| `less-than-or-equal`    | I     | `lessThanOrEqual` (alias `lte`; optional `lessThanOrEqualTo`)       | instance `lessThanOrEqualTo` (alias `lte`)     | predicate, full        | P1       | ⬜ (via `compare`)                                                             |
| `is-zero`               | I     | `isZero`                                                            | instance `isZero`                              | predicate, full        | P1       | ⬜                                                                             |
| `is-integer`            | I     | `isInteger` (alias `isInt`)                                         | instance `isInteger` (alias `isInt`)           | predicate, full        | P1       | ⬜ (`exponent >= 0`)                                                           |
| `is-negative`           | I     | `isNegative` (alias `isNeg`)                                        | instance `isNegative` (alias `isNeg`)          | predicate, full        | P1       | ⬜ (zero is not negative)                                                      |
| `is-positive`           | I     | `isPositive` (alias `isPos`)                                        | instance `isPositive` (alias `isPos`)          | predicate, full        | P1       | ⬜ (zero is not positive)                                                      |
| `sign`                  | S     | `sign(x)`                                                           | static `Decimal.sign(x)`                       | predicate, basic, full | P1       | ⬜ (returns `1 / 0 / -1`; decimal.js also maps NaN/±0, which dezi has none of) |
| `is-nan` / `is-finite`  | —     | —                                                                   | instances `isNaN`, `isFinite`                  | —                      | —        | ❌ intentionally excluded (invariant)                                          |

### Rounding & quantization

Prerequisite: the **rounding modes** (decimal.js `ROUND_UP`, `ROUND_DOWN`, `ROUND_CEIL`, `ROUND_FLOOR`, `ROUND_HALF_UP`, `ROUND_HALF_DOWN`, `ROUND_HALF_EVEN`, `ROUND_HALF_CEIL`, `ROUND_HALF_FLOOR`, `EUCLID`) must be defined first, plus the `Decimal.rounding` configuration static.

| Extension               | Sides | dezi name (aliases)                              | decimal.js name                                                           | Presets                | Priority | Status                                                                 |
| ----------------------- | ----- | ------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------- | -------- | ---------------------------------------------------------------------- |
| rounding modes          | S     | `ROUND_*` constants + `rounding`                 | `ROUND_UP` … `EUCLID` + `rounding` config                                 | config, full           | P0       | ⬜ (gate: `divide` needs a rounding mode and default)                  |
| `floor`                 | I + S | `floor`                                          | instance `floor`; static `Decimal.floor(x)`                               | rounding, full         | P1       | ⬜ (exact)                                                             |
| `ceil`                  | I + S | `ceil`                                           | instance `ceil`; static `Decimal.ceil(x)`                                 | rounding, full         | P1       | ⬜ (exact)                                                             |
| `truncate`              | I + S | `truncate` (alias `trunc`)                       | instance `truncated` (alias `trunc`); static `Decimal.trunc(x)`           | rounding, full         | P1       | ⬜ (exact)                                                             |
| `round`                 | I + S | `round`                                          | instance `round()` (whole number, no args); static `Decimal.round(x)`     | rounding, full         | P1       | ⬜ (exact)                                                             |
| `to-decimal-places`     | I     | `toDecimalPlaces(dp?, rm?)` (alias `toDP`)       | instance `toDecimalPlaces` (alias `toDP`); no static                      | rounding, full         | P1       | ⬜ (omitted `dp` → unchanged value)                                    |
| `to-nearest`            | I     | `toNearest(x, rm?)`                              | instance `toNearest` (exact); no static                                   | rounding, full         | P2       | ⬜ (quantize to multiples of `x`)                                      |
| `clamp`                 | I + S | `clamp(min, max)`                                | instance `clampedTo` (alias `clamp`); static `Decimal.clamp(x, min, max)` | rounding, full         | P1       | ⬜ (exact)                                                             |
| `decimal-places`        | I     | `decimalPlaces()` (alias `dp`)                   | instance `decimalPlaces` (alias `dp`); no static                          | rounding, format, full | P2       | ⬜ (count getter)                                                      |
| `significant-digits`    | I     | `significantDigits(includeZeroes?)` (alias `sd`) | instance `precision([include_zeros])` (alias `sd`); no static             | rounding, format, full | P2       | ⬜ (digit-count getter; name TBD vs future `Decimal.precision` config) |
| `to-significant-digits` | I     | `toSignificantDigits(sd?, rm?)` (alias `toSD`)   | instance `toSignificantDigits` (alias `toSD`); no static                  | rounding, format       | P2       | ⬜ (omitted `sd` → `Decimal.precision`)                                |

### Format & conversion

| Extension         | Sides | dezi name (aliases)              | decimal.js name                                                                                          | Presets                | Priority | Status                                    |
| ----------------- | ----- | -------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------- | -------- | ----------------------------------------- |
| `to-string`       | I     | `toString`                       | instance `toString`; no static                                                                           | format, basic, full    | P0       | ✅                                        |
| `to-plain-string` | I     | `toPlainString(fractionDigits?)` | — (always-plain form reached via `toFixed()`); no static                                                 | format, basic, full    | P0       | ✅                                        |
| `to-number`       | I     | `toNumber`                       | instance `toNumber`; no static                                                                           | format, full           | P1       | ⬜ (precision loss documented)            |
| `to-fixed`        | I     | `toFixed(dp?, rm?)`              | instance `toFixed(dp?, rm?)`; no static                                                                  | rounding, format, full | P1       | ⬜ (omitted `dp` → exact plain expansion) |
| `to-exponential`  | I     | `toExponential(dp?, rm?)`        | instance `toExponential(dp?, rm?)`; no static                                                            | format, full           | P2       | ⬜ (reuses `utils/string.ts`)             |
| `to-precision`    | I     | `toPrecision(sd?, rm?)`          | instance `toPrecision(sd?, rm?)`; no static                                                              | format, full           | P2       | ⬜                                        |
| `to-json`         | I     | `toJSON`                         | instance `toJSON` (= `valueOf`); no static                                                               | format, full           | P3       | ⬜                                        |
| `value-of`        | I     | `valueOf`                        | instance `valueOf` (like `toString` but keeps `−0`; dezi ≡ `toString`); no static                        | format, full           | P3       | ⬜                                        |
| `to-fraction`     | I     | `toFraction(maxDenominator?)`    | instance `toFraction(max_denominator?)` → `[Decimal, Decimal]`; dezi plans `[bigint, bigint]`; no static | format, full           | P3       | ⬜                                        |

### Base-radix conversion

| Extension        | Sides | dezi name (aliases)                       | decimal.js name                                     | Presets     | Priority | Status |
| ---------------- | ----- | ----------------------------------------- | --------------------------------------------------- | ----------- | -------- | ------ |
| `to-binary`      | I     | `toBinary(sd?, rm?)`                      | instance `toBinary(sd?, rm?)`; no static            | bases, full | P3       | ⬜     |
| `to-octal`       | I     | `toOctal(sd?, rm?)`                       | instance `toOctal(sd?, rm?)`; no static             | bases, full | P3       | ⬜     |
| `to-hexadecimal` | I     | `toHexadecimal(sd?, rm?)` (alias `toHex`) | instance `toHexadecimal` (alias `toHex`); no static | bases, full | P3       | ⬜     |

Input side: decimal.js's constructor also parses `0x`/`0b`/`0o` strings (with `p` binary exponents). dezi's strict-decimal-string invariant means radix input either arrives as a dedicated parsing extension or is rejected — open decision, P3.

### Powers, roots & logarithms

preset `power`

| Extension | Sides | dezi name (aliases)                    | decimal.js name                                                                                                             | Presets     | Priority | Status                                                   |
| --------- | ----- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | -------------------------------------------------------- |
| `sqrt`    | I + S | `sqrt`                                 | instance `squareRoot` (alias `sqrt`); static `Decimal.sqrt(x)`                                                              | power, full | P1       | ⬜ (correctly rounded)                                   |
| `pow`     | I + S | `pow` (aliases `power`, `toPower`)     | instance `toPower` (alias `pow`); static `Decimal.pow(base, exponent)`                                                      | power, full | P2       | ⬜ (integer exponents exact; fractional precision-based) |
| `cbrt`    | I + S | `cbrt`                                 | instance `cubeRoot` (alias `cbrt`); static `Decimal.cbrt(x)`                                                                | power, full | P2       | ⬜ (real sign-preserving root)                           |
| `exp`     | I + S | `exp`                                  | instance `naturalExponential` (alias `exp`); static `Decimal.exp(x)`                                                        | power, full | P2       | ⬜                                                       |
| `ln`      | I + S | `ln`                                   | instance `naturalLogarithm` (alias `ln`); static `Decimal.ln(x)`                                                            | power, full | P2       | ⬜ (digit-limit note below)                              |
| `log`     | I + S | `log(base?)` + statics `log2`, `log10` | instance `logarithm` (alias `log`; default base 10); statics `Decimal.log(x, base?)`, `Decimal.log2(x)`, `Decimal.log10(x)` | power, full | P2       | ⬜                                                       |
| `hypot`   | S     | `hypot(x, y, ...)`                     | static `Decimal.hypot(x, y, ...)`                                                                                           | power, full | P2       | ⬜ (square root of the sum of squares)                   |

### Trigonometric

preset `trigonometric` — all precision-based; domain violations throw (see invariants); arguments and results interpreted in **radians**.

| Extension | Sides | dezi name (aliases)       | decimal.js name                                                    | Presets             | Priority | Status                                                  |
| --------- | ----- | ------------------------- | ------------------------------------------------------------------ | ------------------- | -------- | ------------------------------------------------------- |
| `sin`     | I + S | `sin`                     | instance `sine` (alias `sin`); static `Decimal.sin(x)`             | trigonometric, full | P3       | ⬜                                                      |
| `cos`     | I + S | `cos`                     | instance `cosine` (alias `cos`); static `Decimal.cos(x)`           | trigonometric, full | P3       | ⬜                                                      |
| `tan`     | I + S | `tan`                     | instance `tangent` (alias `tan`); static `Decimal.tan(x)`          | trigonometric, full | P3       | ⬜                                                      |
| `arcsin`  | I + S | `arcsin` (alias `asin`)   | instance `inverseSine` (alias `asin`); static `Decimal.asin(x)`    | trigonometric, full | P3       | ⬜ (throws outside `[-1, 1]`)                           |
| `arccos`  | I + S | `arccos` (alias `acos`)   | instance `inverseCosine` (alias `acos`); static `Decimal.acos(x)`  | trigonometric, full | P3       | ⬜ (throws outside `[-1, 1]`)                           |
| `arctan`  | I + S | `arctan` (alias `atan`)   | instance `inverseTangent` (alias `atan`); static `Decimal.atan(x)` | trigonometric, full | P3       | ⬜                                                      |
| `arctan2` | S     | `arctan2` (alias `atan2`) | static only: `Decimal.atan2(y, x)`                                 | trigonometric, full | P3       | ⬜ (quadrant-correct; throws when both inputs are zero) |

### Hyperbolic

preset `hyperbolic` — all precision-based; domain violations throw.

| Extension | Sides | dezi name (aliases)       | decimal.js name                                                                | Presets          | Priority | Status                        |
| --------- | ----- | ------------------------- | ------------------------------------------------------------------------------ | ---------------- | -------- | ----------------------------- |
| `sinh`    | I + S | `sinh`                    | instance `hyperbolicSine` (alias `sinh`); static `Decimal.sinh(x)`             | hyperbolic, full | P3       | ⬜                            |
| `cosh`    | I + S | `cosh`                    | instance `hyperbolicCosine` (alias `cosh`); static `Decimal.cosh(x)`           | hyperbolic, full | P3       | ⬜                            |
| `tanh`    | I + S | `tanh`                    | instance `hyperbolicTangent` (alias `tanh`); static `Decimal.tanh(x)`          | hyperbolic, full | P3       | ⬜                            |
| `arcsinh` | I + S | `arcsinh` (alias `asinh`) | instance `inverseHyperbolicSine` (alias `asinh`); static `Decimal.asinh(x)`    | hyperbolic, full | P3       | ⬜                            |
| `arccosh` | I + S | `arccosh` (alias `acosh`) | instance `inverseHyperbolicCosine` (alias `acosh`); static `Decimal.acosh(x)`  | hyperbolic, full | P3       | ⬜ (throws below `1`)         |
| `artanh`  | I + S | `artanh` (alias `atanh`)  | instance `inverseHyperbolicTangent` (alias `atanh`); static `Decimal.atanh(x)` | hyperbolic, full | P3       | ⬜ (throws outside `(-1, 1)`) |

### Static utility & configuration ops

preset `config` — dezi-native configuration surface (see design notes for the decimal.js mapping).

| Extension    | Sides | dezi name (aliases) | decimal.js name                    | Presets      | Priority | Status                                                           |
| ------------ | ----- | ------------------- | ---------------------------------- | ------------ | -------- | ---------------------------------------------------------------- |
| `max`        | S     | `max(x, y, ...)`    | static `Decimal.max(x, y, ...)`    | basic, full  | P1       | ⬜ (exact, compare-based; empty args throw)                      |
| `min`        | S     | `min(x, y, ...)`    | static `Decimal.min(x, y, ...)`    | basic, full  | P1       | ⬜                                                               |
| `is-decimal` | S     | `isDecimal(value)`  | static `Decimal.isDecimal(object)` | config, full | P3       | ⬜ (type guard)                                                  |
| `random`     | S     | `random(dp?)`       | static `Decimal.random(dp?)`       | config, full | P3       | ⬜ (`dp` defaults to `precision`; `crypto`-source decision note) |
| `set`        | S     | `set(props)`        | static `Decimal.set(object)`       | config, full | P3       | ⬜                                                               |
| `clone`      | S     | `clone(props?)`     | static `Decimal.clone(object)`     | config, full | P3       | ⬜ (open design question — note 3)                               |

## Presets

| Preset          | Contents                                                                | Priority |
| --------------- | ----------------------------------------------------------------------- | -------- |
| `full` ✅       | every extension (already exists)                                        | P0       |
| `basic`         | arithmetic + `compare` + `max`/`min` + basic format                     | P0       |
| `predicate`     | comparison sugar + booleans + `sign`                                    | P1       |
| `rounding`      | rounding family + modes                                                 | P1       |
| `format`        | string/number conversions                                               | P1       |
| `power`         | roots, powers, exp/log family                                           | P2       |
| `trigonometric` | trig + inverse trig                                                     | P3       |
| `hyperbolic`    | hyperbolic + inverse                                                    | P3       |
| `bases`         | binary/octal/hexadecimal conversion                                     | P3       |
| `config`        | static config utilities (`set`, `clone`, `random`, `is-decimal`, modes) | P3       |

Presets ship as `./preset/<name>` subpaths; each lists only side-effect imports so consumers can still import single extensions (`./extensions/<name>`) instead.

## Design notes

1. **Exact vs precision-based operations.** decimal.js rounds to `precision` in every operation except `absoluteValue`, `ceil`, `floor`, `negated`, `round`, `toDecimalPlaces`, `toNearest` and `truncated`. dezi deliberately diverges for the additive/multiplicative family: `plus`, `minus`, `times`, `absolute`, `negate`, `sum` and `modulo` (on exact operands) stay fully exact — bigints carry arbitrary precision. Division and transcendental functions are inherently inexact; they round to `Decimal.precision` significant digits using the configured rounding mode. Docs must call out per-extension whether it is exact or precision-based.
2. **Configuration surface mapping (decimal.js → dezi).**
   - `precision` → lands with the first precision-based op (needed by `divide`, P0); intentionally **not** part of the core constructor anymore
   - `rounding` → `Decimal.rounding` ⬜ P1 (needed by the whole rounding/format family)
   - `minE` / `maxE` → `Decimal.exponentLimit` (dezi-native, single symmetric limit) ✅
   - `toExpNeg` / `toExpPos` (exponential-notation thresholds) → `Decimal.minPlainExponent` / `Decimal.maxPlainExponent` (owned by the `to-string` extension) ✅
   - `modulo` (rounding mode for `modulo`) → ⬜ P3
   - `crypto` (entropy source for `random`) → ⬜ P3
   - `noConflict()` → excluded (UMD-era global cleanup, meaningless for ESM)
3. **`Decimal.clone()` design question.** decimal.js `clone(props)` returns a whole new constructor class with its own configuration. dezi currently has a single class with mutable statics. Options: (a) skip parity and keep one configured global, (b) `clone` returning a `DecimalConstructor` facade with overridden config. Decide at implementation time — blockers: none.
4. **Naming & alias policy.** dezi picks its own consistent verb-style names instead of inheriting decimal.js's mixed scheme (short operator names `plus`/`minus`/`times`, participles like `dividedBy`, descriptives like `squareRoot`/`toPower`). Rules: primaries are short verbs (`divide`, `pow`, `sqrt`, `negate`), boolean predicates drop decimal.js's trailing `To` (`lessThanOrEqual`, not `lessThanOrEqualTo`), and aliases are shorter equivalents without filler words (`div`, `sub`, `gt`). decimal.js names stay in the tables only as parity-audit references; conversion methods keep the JS-native `to*` family (`toString`, `toFixed`, …).
5. **Static mirrors.** decimal.js exposes short-named static forms for many operations (`Decimal.add(x, y)`, `Decimal.div(x, y)`, `Decimal.sin(x)`, …) whose names diverge from its instance primaries (`plus`, `dividedBy`, `sine`). If dezi mirrors an instance method as a static, it keeps the **same name** on both sides (as `compare`, `floor`, `clamp` already plan) — no `Decimal.add` vs `.plus` split.
6. **Instance property surface.** decimal.js instances expose internal fields `d`/`e`/`s` (digits array, exponent, sign, all best treated read-only). dezi instances expose `coefficient`, `exponent` and `raw`, which cover the same information; `d`/`e`/`s` aliases are not planned.
7. **Transcendental digit limits.** decimal.js's internal `LN10` and `PI` constants carry 1025 digits, so `ln`/trig results are only correctly rounded up to roughly 1000 digits (max result precision ≈ 1000 − argument precision for trig). dezi inherits equivalent constraints when these families land; document as footnotes rather than behavior differences.
8. **Every extension ships with:** its `declare module "dezi"` augmentation(s), `extend()`/`extendStatic()` registration, side-effect imports of dependencies, unit tests, and no new files outside `src/extensions/`, `src/preset/`, `test/`.

## Milestones

- **v0.1 — Arithmetic core complete (P0).** Rounding-mode constants + `rounding` static, `divide`, plus docs on exact vs precision-based ops; `basic` + `full` presets exported.
- **v0.2 — Everyday usability (P1).** Rounding family (`floor`/`ceil`/`trunc`/`round`/`to-decimal-places`/`clamp`), `to-fixed`/`to-number`, comparison sugar + predicates + `sign`, `max`/`min`, `sum`, `sqrt`; `predicate`/`rounding`/`format` presets.
- **v0.3 — Advanced math (P2).** `pow`, `cbrt`, `exp`, `ln`, `log`, `to-significant-digits`, `to-exponential`, `to-precision`; `power` preset.
- **v0.4 — Transcendental completeness (P3).** Trigonometric + hyperbolic families; `trigonometric`/`hyperbolic` presets.
- **v0.5 — Configuration & parity audit (P3).** `config` extensions (`set`, `clone` decision, `random` + entropy source, `is-decimal`), base-radix conversions, `to-fraction`/`to-json`/`value-of`, and a full parity audit against the decimal.js method list.

---

Status: 8 of 69 planned extension modules shipped, grouped into 10 presets (`full` is live; the rest land with their families). The rounding-mode constants moved up to P0: `divide` depends on them, so the rounding/format families unblock with v0.1.
