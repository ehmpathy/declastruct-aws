# F11 — every caller variant of the skill is snapped, even where two snaps match byte for byte

## .the fork
- A: snap only the variants whose stdout differs (case4 t0, t1, t2), and let asserts alone carry t3–t6, whose stdout matches t1
- B: snap every success variant, t0–t9

## .taken
B. two reviewers ask opposites: one lane graded the unsnapped `[t4]`–`[t7]` a blocker under `rule.require.contract-snapshot-exhaustiveness` ("every variant a caller could encounter"); the other calls the identical snaps noise. the rule's own test favors B: a snap that matches its twin today is the one that catches a future drift in that variant alone (e.g. a subdir run that prints a different root, or a `.env` with `AWS_*` that leaks a line). the cost is review length, paid only when the output changes.

## .rework
clean: drop the `toMatchSnapshot()` from any twin variant; the asserts stay.

## .confidence — 80%
why not higher: a reviewer of a later change may read the five identical snaps as five changes.

## .verdict
open — for the director at the done gate.
