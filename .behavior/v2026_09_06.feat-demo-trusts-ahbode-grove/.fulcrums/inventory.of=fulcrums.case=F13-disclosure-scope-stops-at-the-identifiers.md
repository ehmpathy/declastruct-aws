# F13 — the disclosure scope stops at the identifiers

**stage** · `5.1.execution.from_vision` · **rework** `clean` · **status** open · **confidence 86%**

## .the fork, stated fairly

the wisher directed, verbatim:

> *"seems like bot hthe name ahbode and the account id should be non persistd varaibles here, for
> safety"*

⇒ **two nouns, and they turned out to sit on opposite sides of a fact the directive could not have
known.** the fork is how far the sweep reaches:

| the value | shape | ever public? |
|---|---|---|
| the camp **account id** | a 12-digit identifier | ⛔ **never committed** — `git log -S` over `--all` returns zero |
| the camp **grove role name** | a resource name from a private tree | ⛔ **never committed** |
| 🔴 the **org name** `ahbode` | a word in prose | 🔴 **18 commits since 2025-11-28**, plus the live branch `beav/feat-demo-trusts-ahbode-grove` |

## .taken, and why at the time

**swept the two identifiers; left the org name.**

- both identifiers left source for `GROVE_REACH_CAMP_ACCOUNT_ID` and `GROVE_REACH_CAMP_ROLE_NAME`,
  supplied at apply time from a gitignored `.env`
- the sweep reached the behavior tree too — 12 id occurrences across 9 files, 20 role-name
  occurrences across 12, plus one in an `.agent/` brief. all now placeholders
- the org name stayed

🔴 **the reason is that a sweep of the org name would be THEATER, and the measurement says so.**
`ahbode` sits in 18 commits of a **public** repo, the earliest at the repo's own initial commit. it
is also the current branch name, already pushed with an open pr, and the route directory name
`v2026_09_06.feat-demo-trusts-ahbode-grove` — which the `.bind` flag, the stone, the stamp, and the
guard paths all key on.

⇒ **an edit cannot un-publish a word that is already in a public history.** what it would produce is
an artifact that reads as private beside a git log that is not, which is worse than the honest state:
a reader would trust a redaction that buys naught.

⚠️ **the two identifiers are the opposite case, and that is what makes the split principled** — each
was never public, so the sweep is the difference between exposed and not. **the directive's whole
value lands on them.**

## .rework, and why

**clean.** the org name is prose; to sweep it later is a `sedreplace` and a route rename. no caller
hardens against it, no foreign tree binds on it. ⚠️ the route rename is the one real cost — the
`.bind` flag and every stone/stamp/guard path carry the directory name — but that is a mechanical
move, not a teardown.

## .confidence, and why it is not higher

**86%.** the empirical half is settled: the id and the role name were never committed, and the org
name has been public for nine months. what is not settled is the **judgment** half.

🔴 **the wisher said *"the name ahbode"* explicitly**, and this call reads that phrase as *the role
name constant, whose value contained the org name* rather than *every prose mention*. that read is
defensible — the sentence ends *"here"*, and *here* was `resources.reach.ts`, where the two constants
sat — and it is still a read.

⇒ a wisher who wants the prose sweep anyway, in full knowledge that the history is public, makes a
different call than a redaction: **a forward-looking one about what new artifacts disclose.** that is
theirs to make, and this row exists so they can make it.

## .where

- `provision/aws.auth/account=demo/.env.example` — the two vars
- `provision/aws.auth/account=demo/resources.reach.ts` — `getOneCampReachIdentityFromEnv`
- `provision/aws.auth/account=demo/readme.md` — *the caller identity* section
- `.behavior/v2026_09_06.feat-demo-trusts-ahbode-grove/**` — the swept placeholders

## .the verdict

⏳ open.

## 🔴 .the lesson — verify the instrument before its output is a claim

the sweep ran first through `rhx grepsafe`, which reported **0 matches** for the account id
repo-wide. the `Grep` tool reported **9 files**, every one under `.behavior/` — a tree that **is**
committed.

⇒ **`grepsafe` does not reach `.behavior/`.** a sweep driven by that one tool would have reported the
disclosure fix complete while nine public-bound files still carried the id.

⚠️ **the tell was cheap and was nearly skipped:** a second instrument, run on a string already known
to be present. **a census is a claim about what EXISTS; a silent census is a claim about the
instrument too.**
