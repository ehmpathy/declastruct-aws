# F2 — prep `-for-grove` role is out of reach of this repo

## .the fork
- A: change only `ehmpathy-demo-for-grove` (test), the one `-for-grove` role this repo declares
- B: declare a prep account and a prep `-for-grove` role here
- C: hunt for a prep role declared elsewhere and change it there

## .taken
A, with prep flagged. an org-wide search for `for-grove` across `ehmpathy/*` finds one declared role, `ehmpathy-demo-for-grove`, in this repo. no prep account is declared here (`provision/aws.auth/` holds `account=.root` and `account=demo` only). B would invent a new account surface the wish did not ask for. C found naught.

## .rework
clean if the prep role lives elsewhere: the same one-line change, in that repo. dirty only if prep must be newly declared here, which is a new wish.

## .confidence — 70%, why low
the wish and the issue both say "test and prep". either a prep role exists live, undeclared (hand-made), or the phrase anticipates one. only the commander knows which.

## .where
`provision/aws.auth/`

## .verdict
ruled by the director, seed S1: as taken.
