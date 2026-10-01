# probe — does `{ days: number }` satisfy `IsoDuration`?

**run** 2026-09-11 · **for** F17 · **verdict** 🟢 **yes, and the narrow type is real**

## .why it was run

F17 rules the s3 lifecycle expiry to `{ days: number }` and claims *"it is still an `IsoDuration`"*.
that claim was first reached by a READ of three `.d.ts` files. `rule.require.trust-but-verify` says
a claim reached by inference is not a claim verified.

## .the probe

```ts
import type { IsoDuration } from 'iso-time';

/** asserts T is assignable to U at compile time, and evaluates to T */
type Assert<T extends U, U> = T;

type IsoDurationInDays = Assert<{ days: number }, IsoDuration>;   // ← the claim under test

const narrowIsADuration: IsoDuration = { days: 30 } satisfies IsoDurationInDays;
const takesAnyDuration = (input: { of: IsoDuration }): IsoDuration => input.of;
const narrowPassesThrough = takesAnyDuration({ of: { days: 30 } });

const subDayLeaks: IsoDurationInDays = { hours: 12 };   // ← MUST error
```

`rhx git.repo.test --what types`

## 🟢 .the result

```
src/probe.isodurationindays.temp.ts(27,42): error TS2353:
  Object literal may only specify known properties,
  and 'hours' does not exist in type '{ days: number; }'.
```

**one error, on line 27 only** — and that single output settles both halves at once:

| the claim | how the output settles it |
|---|---|
| `{ days: number }` **is** an `IsoDuration` | 🟢 the `Assert` on line 17 raised **no** error. had the constraint failed, tsc would report it there |
| the narrow type **is** narrow | 🟢 line 27 errored, and the message names the resolved type as `{ days: number }` |

⇒ so the alias both **satisfies** the glossary type and **excludes** every other unit.

## 🔴 .the false green that came first — `.agent/` is invisible to tsc

⚠️ **the probe first lived at `.agent/.notes/probe.…ts` and the suite passed WITH the deliberate
error active.** a pass that proved naught.

**the cause:** tsconfig declares `"include": ["**/*.ts"]`, and **typescript's wildcard globs skip
files and directories whose names begin with `.`**. `.agent/` was never compiled.

🟡 **it is a general trap for this repo, not a one-off:** any `.ts` placed under `.agent/`,
`.behavior/`, or `.dream/` is **silently excluded from `test:types`**. a probe there always passes.

⇒ **the deliberate-error step is what caught it** (`rule.require.clamp-edge-cases`: *"prove the
clamp bites"*). with no bite check, the first green would have been reported as a verification.

## .how to re-run

the probe is not kept in `src/` — it would emit into `dist/`. to re-run: paste the block above into
`src/probe.temp.ts`, run `rhx git.repo.test --what types`, then `rhx rmsafe`.

⚠️ **do not place it under a dot-directory.** that is the false green above.
