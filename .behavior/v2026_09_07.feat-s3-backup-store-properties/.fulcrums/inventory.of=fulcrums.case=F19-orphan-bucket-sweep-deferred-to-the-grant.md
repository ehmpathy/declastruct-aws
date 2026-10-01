# F19 — the orphan-bucket sweep is deferred to the grant it needs

**stage** `5.1.execution` · **rework** clean · **status** 🔴 **OPEN** · **confidence** 90%

## .the fork, stated fairly

`s3Bucket.journey`'s `beforeAll` claims to *"remove any leftover from a prior crashed run"* and
cannot: `testName` carries a fresh uuid per run, so a crashed run's bucket sits under a different
name. the sweep is a guaranteed no-op, and orphan buckets accrue unbounded and silent.

| option | what it costs | what it buys |
|---|---|---|
| **a** — fix it now: `getAllS3Buckets({ by: { tags } })` + a tag sweep | a new domain op, a new sdk call, **and a new `s3:ListAllMyBuckets` grant** | the leak stops at the next run |
| 🟢 **b — correct the false comment, defer the sweep** | the leak keeps accruing until the grant lands | no unrunnable code on a branch whose lane is already red |

## .taken, and why at the time

**(b).** the deferral is **forced rather than chosen**, and that is what settles it:

- every sweep shape needs to enumerate buckets by tag
- that enumeration needs `s3:ListAllMyBuckets`
- 🔴 `demoPermissionsPolicy` grants `s3:ListBucket`, which is the **object-level peer and not this
  action** — the names mislead, the actions differ
- ⇒ so option (a) needs a new grant, and **that grant lands in the exact two-tree apply stone 5.1 is
  already halted on**

⇒ there is no cheaper path that skips the grant, so (a) cannot be verified before the halt clears.
to author it now would add unrunnable code to a red lane.

⚠️ **what WAS done, because it is safe and clean:** the false comment is corrected in place, and now
names the gap, the precedent (`vpc.journey`), the absent grant, and the dream. the lie is gone even
though the fix is not.

## .rework, and why

**clean.** naught is built on the deferral. when the grant lands, the sweep is an additive change:
one new op, one `beforeAll` swap. no caller depends on the current no-op, and no shape hardens
against it.

## .confidence, and why it is not higher

**90%.** the dirt is verified rather than estimated — the grant gap was measured against
`resources.common.ts`, not assumed.

the 10% is one alternative the drive did not take: **a wisher could rule the leak urgent enough to
warrant a scratch-tree apply for the list grant alone**, ahead of the grove merge. that trades a
one-off out-of-band apply for an immediate stop to the accrual. the drive judged an unbounded but
cheap leak not worth an extra apply against a role it does not own — **a cost judgment, and the kind
this register exists to surface.**

## .where

- `src/domain.operations/s3Bucket/s3Bucket.journey.integration.test.ts` — the corrected comment
- `.dream/v2026_09_21.feat.reap-orphan-test-buckets-by-tag.md` — the deferred work
- `provision/aws.auth/resources.common.ts:340` — `s3:ListBucket`, the grant that is NOT the one owed

## .the verdict

— **open.** no council has ruled it.

## .the cheap read that would inform the ruling

```sh
aws s3api list-buckets --query "Buckets[?starts_with(Name, 'declastruct-test-s3-')].Name"
```

⇒ **it sizes the leak before anyone rules on it.** empty → the deferral is nearly free and (b) is
plainly right. non-empty and large → (a)'s scratch-tree apply gains a real argument. the driver
cannot run it: the enumeration is the very action that is ungranted.

## .see also

- `.dream/v2026_09_21.feat.reap-orphan-test-buckets-by-tag.md` — the work half of this deferral
- `rule.require.ec2-test-cleanup-both-ends` — the both-ends discipline the journey violates
- `rule.always.fix-forward-under-scouts-honor` — why a dirt deferral owes a fulcrum beside its dream
- `../blocker/5.1.execution.from_vision.md` — the halt whose grant gap makes (a) unverifiable
