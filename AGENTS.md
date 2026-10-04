# AGENTS.md

Notes for AI agents working in this repo.

## What dezi is

An arbitrary-precision decimal library aiming at decimal.js parity, but opt-in: a tiny core (`src/decimal.ts`) plus small extension modules a consumer imports individually or via presets (`src/preset/*`). `ROADMAP.md` is the source of truth for what exists and what is planned.

## Hard rules from the maintainer

- **Never touch `build.ts` or `package.json`.** The package exports are loaded automatically via tsdown; the build script is the maintainer's domain.
- **No hacky solutions.** Never post-process or rewrite `declare module` expressions, never add code-heavy workarounds. Type-level extension via interfaces must keep working as designed.
- No new dependencies, no new folder kinds without maintainer approval.

## Invariants (deliberate deviations from decimal.js)

- **No NaN, no ±Infinity, no signed zero.** Parse is strict; operations that would produce non-finite results throw `RangeError` instead of saturating (details in ROADMAP "Invariants").
- Zero is always `[0n, 0]`.

## Architecture

- `src/decimal.ts` — the core: `interface Decimal` (instance merge target), `interface DecimalConstructor`, `DecimalLike`/`RawDecimal` types, and `const Decimal` backed by an internal class (one documented boundary cast).
- Extensions live in kind folders, categorized by what they return/touch:
  - `src/ops/` — return new Decimal values (plus, divide, sqrt, max, floor, …)
  - `src/check/` — questions about a value: booleans, comparisons, counts, guards
  - `src/format/` — output representations (toString, toFixed, toNumber, …)
  - `src/config/` — global settings and value-less factories (precision, rounding, set…)
- Each extension has exactly **one** `declare module "dezi"` block declaring both interfaces and any exported types (e.g. `RoundingMode`). Runtime members attach via `extend()`/`extendStatic()` from `src/utils/extend.ts`; aliases must also be declared inside the block.
- The `"dezi"` specifier is never relative: tsconfig paths maps it to `src/index.ts` in-repo; consumers resolve it via package self-reference.
- Config statics are owned by extensions, not the core constructor (`precision` lives in `src/config/precision.ts`, notation thresholds in `src/format/to-string.ts`); consumers read them through side-effect imports of the owning extension.
- Static methods are the exception: only receiver-less operations (`max`, `min`, `sum`, `hypot`, `arctan2`, `sign`) and the two-sided `compare` allowlist. No `Decimal.add(x, y)`-style mirrors of instance ops.
- Arithmetic family is exact (bigints); divide/transcendental ops are precision-based: they round to `Decimal.precision` significant digits using `Decimal.rounding` (a string-union `RoundingMode`, default `"half-up"`).
- Naming: verb primaries without filler words (`divide`, not `dividedBy`; `lessThanOrEqual`, not `lessThanOrEqualTo`), short aliases (`div`, `sub`, `gt`). decimal.js names appear in ROADMAP tables as parity-audit references only.
- Public API signatures use meaningful parameter names, never generic single letters (`sign(value)`, not `sign(x)`; explicit pairs like `compare(a, b)` are fine). Variadic value lists use `...values`.
- JSDoc describes dezi's behavior in its own terms; never mention decimal.js in JSDoc. Internal file comments may reference decimal.js for design context.
- Simple shared helpers live in `src/utils/` and are imported, never redeclared per extension file: reach for `digitsOf` (digit count, instead of inline `.toString().length`) and the `LOG2_10`/`LOG10_2` float seeds in `utils/common.ts`, and for the integer Newton roots `isqrt`/`icbrt` in `utils/integer-roots.ts`, before writing a local copy.

## Reference: decimal.js source

<https://raw.githubusercontent.com/MikeMcl/decimal.js/refs/heads/master/decimal.js>

decimal.js is dezi's parity target and doubles as a reference for how an implementation of a math operation can look (rounding pipelines, argument reduction, series summation, exponentiation by squaring). Read it as **inspiration, not source**:

- The code is dated and does not use `bigint`: it stores digits in arrays and rounds in every operation — none of that carries over.
- Re-express its algorithms on dezi's primitives: normalized `[coefficient, exponent]` bigint pairs, `roundToScale`/`roundingIncrement` (`src/utils/rounding.ts`), and the precision/guard patterns of `src/ops/sqrt.ts` and `src/ops/divide.ts`.
- Keep dezi's invariants (throw instead of NaN/±Infinity, no signed zero) and dezi's naming from ROADMAP.md, never decimal.js's.

## Workflow for a new extension

1. One file in the right folder, one test mirrored in `test/<folder>/` (vitest, imports the extension for side effects).
2. Augmentation block, `extend()`/`extendStatic()` registration, side-effect imports of dependencies (last import lines, after a blank line, under the comment `// required extensions`), JSDoc on public members.
3. Update the `ROADMAP.md` status column; add the extension to presets only when asked.
4. When asked to implement several extensions, use one subagent per extension (their file sets are disjoint).
5. Validate with `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/vitest run`, `./node_modules/.bin/biome check src test`, and `node build.ts`.

- Style: tabs, double quotes, biome-clean, `import type` for type-only imports. Use `type` for type declarations; `interface` only where declaration merging requires it: the `Decimal`/`DecimalConstructor` targets in `src/decimal.ts` and inside `declare module "dezi"` blocks.
