# F4 — declapract-managed husky hooks are fixed at source, not by hand here

## .the fork
- A: hand-edit `.husky/check.timestamps.sh` and `.husky/check.yalc.sh` in this repo to answer the peer concerns (headers, stderr, message text)
- B: leave both as the template lays them down; fix at the template, `ehmpathy/declapract-typescript-ehmpathy`

## .taken
B. both files are `src/practices/husky/best-practice/.husky/*` in that template, and the worktree's rhachet upgrade laid them down verbatim (declapract-typescript-ehmpathy 0.50.0, the latest published). a hand edit diverges from the practice, and the next `declapract apply` overwrites it.
- `check.timestamps.sh`: the template's `main` already carries the fix (`✋ ConstraintError:` / `💥 MalfunctionError:` headers, stderr, "tracked files" in place of "snapshots"); it ships on the template's next release
- `check.yalc.sh`: the template's `main` still holds `2>/dev/null` and the stdout notice; reseeded as `.dream/v2026_11_15.reseed.declapract-yalc-hook-failhide.md`

## .rework
clean: if the call goes the other way, two small hand edits to two hook files, no ripple.

## .confidence — 85%
why not higher: a reviewer may judge that a shipped hook defect outranks template parity. the harm is low (a pre-commit message, not runtime), which is why parity wins here.

## .where
`.husky/check.timestamps.sh:34,42`, `.husky/check.yalc.sh:5,9`. concerns: r2 blocker.1, r2 blocker.2, r6 blocker.1, r6 nitpick.1, r9 nitpick.1, r9 nitpick.2.

## .verdict
open — for the director at the done gate.
