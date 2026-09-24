# hazard.release-skipped-on-unparseable-commit-body

## .what

## severity: blocker

a commit body that release-please cannot parse is **silently dropped** from the release
calculation. the `release` workflow still reports **success**, no release pr appears, no tag is
cut, and no publish runs — so a release that never happened looks exactly like a release that
was not owed.

keep commit bodies to the shape every prior release-cutting commit in this repo used: **plain
prose plus `-` bullets**. no markdown `## ` headers.

---
---
---

# deets

## .the measured incident — 2026-09-24

`a67ea47` — `feat(auth): declare the grove-reach role for a collaborator camp box (#105)` —
merged to main with all 12 checks green. the release workflow ran and **succeeded**. its log:

```
commit could not be parsed: a67ea471 feat(auth): declare the grove-reach role ... (#105)
commits: 0
No commits for path: ., skipping
```

⇒ zero releasable commits, so no release pr, no tag, no publish. `v1.11.0` stayed Latest.

## .why it is so easy to miss

every signal a driver normally reads says the release worked:

| signal | what it showed |
|---|---|
| the 12 pr checks | all green |
| the merge | clean, automerge took it |
| the `release` workflow | **completed, success** |
| the release pr | absent — and an absence is not an alert |

⇒ the failure surfaces only in the workflow's own log body, which nobody reads on a success.
**a green workflow that skipped its whole job is the worst shape a defect can take.**

⚠️ `rhx git.release --into prod` does report `release pr did not appear in 90s`, so the skill
does catch it — but it reads as a timeout, not as a parse failure. the log is what names the cause.

## .the safe shape

every commit on main that cut a release used the same body shape. match it:

- one paragraph of plain prose after the summary line
- `-` bullets for lists
- a `Co-authored-by:` footer
- no markdown `## ` headers
- no fenced code blocks
- every body line wrapped at 100 characters or fewer

⚠️ the last line is enforced locally and the rest are not. commitlint's `body-max-line-length`
rejects a long line at the `commit-msg` husky hook, so an over-long body never reaches a commit.
**no local hook checks the header or fence rules** — those fail only in the release workflow's
log, after the merge, which is exactly why they are the ones that bite.

`a67ea47` is the first commit in 15 on main to carry `## ` headers in its body, and the first
to fail the parser.

⚠️ **that correlation is strong and it is not a proof.** the exact construct the PEG parser
rejected was not isolated — `@conventional-commits/parser` is not a dependency of this repo, so
it could not be run against the message locally. what is verified: the body shape above parses,
and the body shape that failed differs from it by the headers.

⇒ so the rule is stated as **match the shape that works**, never as *"`##` is the culprit"*.

## .how to recover when it has already happened

main cannot be rewritten, so the skipped commit stays skipped. the recovery is a **new, parseable
`feat` or `fix` commit** on main — release-please counts commits since the last tag, so the next
parseable one cuts the release and its changelog covers the window.

⚠️ read the version it cuts. the changelog will name only the parseable commits, so a reader of
the release notes will not see the skipped work. say so in the pr body if it matters.

## .the tell

after any merge to main, ask: **did a release pr appear?**

- yes → normal
- no, and the work was `chore`/`docs` only → correct, no release was owed
- 🔴 **no, and the work was `feat` or `fix`** → suspect a parse failure first. read the
  `release` workflow log for `commit could not be parsed`

## .enforcement

- a commit body with markdown `## ` headers or fenced code blocks = blocker
- a `feat`/`fix` merge to main with no release pr, not investigated = blocker
- a release reported as done on the strength of a green workflow alone = blocker

## .see also

- `.github/workflows/release.yml` — `release-type: node`, so only `feat` and `fix` bump
- `rule.require.git-release-confidence` (ehmpathy/mechanic) — the one question is *did cicd
  pass?*; this hazard is the case where cicd passes and the release still did not happen
- `rule.require.commit-scopes` (ehmpathy/mechanic) — the header half of the same contract
