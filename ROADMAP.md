# ROADMAP

What is still missing. Shipped features are documented in the README; remove items here once they land.

## Release

- Set the version to `0.1.0` and publish from `dist/` (tag-triggered workflow with npm provenance).

## Extensions

| Extension | API | Notes |
| --- | --- | --- |
| trigonometric | `sin`, `cos`, `tan`, `arcsin` (`asin`), `arccos` (`acos`), `arctan` (`atan`), static `arctan2` (`atan2`) | needs π to arbitrary precision; `arcsin`/`arccos` throw outside `[-1, 1]`, `arctan2(0, 0)` throws; new `trigonometric` preset |
| hyperbolic | `sinh`, `cosh`, `tanh`, `arcsinh` (`asinh`), `arccosh` (`acosh`), `artanh` (`atanh`) | via `exp`/`ln`; `arccosh` throws below 1, `artanh` outside `(-1, 1)`; new `hyperbolic` preset |
| bases | `toBinary`, `toOctal`, `toHexadecimal` (`toHex`), each `(sd?, mode?)` | new `bases` preset |
| `to-fraction` | `toFraction(maxDenominator?)` → `[bigint, bigint]` | |
| `random` | static `random(dp?)` | `dp` defaults to `precision`; decide the entropy source (`crypto.getRandomValues`) |
| `set` | static `set(config)` | validated bulk assignment of `precision`, `rounding`, `exponentLimit`, notation thresholds |

Precision-based additions take the trailing `options?: PrecisionOptions` like the existing ops and are added to `src/preset/full.ts`.

## Ideas

- `toLocaleString(locales?, options?)` via `Intl.NumberFormat`, which formats decimal strings exactly.
- Euclidean `modulo` variant (non-negative remainder).
