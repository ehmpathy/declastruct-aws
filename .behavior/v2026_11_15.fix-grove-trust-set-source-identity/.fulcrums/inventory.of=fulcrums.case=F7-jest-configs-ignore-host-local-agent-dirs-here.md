# F7 — the jest configs ignore host-local agent dirs here, and upstream

## .the fork
- A: add `'!**/.agent/.cache/**'` and `'!**/.agent/.actors/**'` to `testMatch` in this repo's three jest configs, plus a reseed to the declapract template
- B: leave the configs as the template ships them; reseed only, and accept a red `--thorough` run on any clone that holds those dirs

## .taken
A. a full unit run read `1419 passed, 6 failed`, every failure in rmsafe's trash or an actor plugin copy; verification owes a green run, and the cause is these configs. the edit is additive (two ignore globs per file) and changes no tracked test's selection: the full run reads `223 files, 1418 passed, 0 failed` with it.

## .the tension with F4
F4 keeps declapract-managed husky hooks out of this pr and fixes them at source. the difference: those hook edits belong to an unowned upgrade bundle and change behavior (fail-open); this edit is needed for this route's own verification and only narrows what jest walks. both still owe the upstream fix: `dreams/v2026_11_16.reseed.jest-config-ignores-host-local-agent-dirs.md`.

## .rework
clean: revert three `testMatch` arrays. the next declapract upgrade may revert them too, until the template carries the globs.

## .confidence — 82%
why not higher: it hand-edits template-managed files, the move F4 avoided; a director may prefer the reseed alone.

## .where
`jest.unit.config.ts`, `jest.integration.config.ts`, `jest.acceptance.config.ts` (`testMatch`).

## .verdict
open — for the director at the done gate.
