# rule.forbid.peer-org-names

## .what

## severity: blocker

this repo is public. no tracked file may name a peer org: an org whose resources we trust, reach,
or collaborate with. say **the peer org** or **a peer**, and keep its identifiers out of source.

forbidden in any tracked file (code, test, snapshot, brief, skill, dream, route, commit body, pr):
- the peer org's name, its github org, or its repo names
- its aws account ids, role names, arns, or start urls
- its people: names, emails, usernames

allowed:
- generic concepts the peer also uses: `camp`, `grove`, `reach`, `-for-grove`
- obvious fakes in fixtures: `000000000000`, `example-*`, `@example.com`
- the real identifiers in a gitignored `.env`, read at plan time (the `account=demo/.env` reach pair)

---
---
---

# deets

## .why

- a public repo is read by anyone. a peer's name, account id, or staff email here discloses who we
  trust and how to reach them, without their consent
- the code never needs the name: the reach role reads its principal from `.env`, so any peer org
  fits the same declaration. the name was only ever prose
- git history keeps a name forever; a rewrite costs every clone. so the cheap moment is before the
  first commit

## .the test

before a tracked write: **could a stranger learn which org we partner with, or how to reach its
people or accounts, from this line?** yes → rewrite to `the peer org` / `a peer`, or move the value
into a gitignored `.env`.

| when… | then… |
|---|---|
| you describe the reach, a revoke, or the caller half | `the peer org`, `the peer's half`, `the peer's infrastructure repo` |
| a fixture needs an account id or role name | `000000000000`, `example-*` |
| a skill needs a default recipient or account | no default; require the flag and fail loud |
| a real identifier is needed to plan or apply | gitignored `.env`, sourced by the runbook |
| you hit an extant mention in a file you touch | fix it forward, in scope |

## .extant mentions

finished route archives under `.behavior/` still hold the name, and one route dir carries it in its
path (`v2026_09_06.feat-demo-trusts-*-grove`). they stay until disturbed; a citation of that dir path
stays verbatim so it resolves. no bulk rewrite of archives, and no history rewrite.

## .enforcement

- a peer org's name, account id, role name, arn, or a person's email in a new tracked line = blocker
- a skill or fixture that defaults to a peer's real identifier = blocker
- an extant mention left in a line your change already edits = nitpick
