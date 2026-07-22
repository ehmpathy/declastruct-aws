# self review r5 — behavior-declaration-coverage

## the gap i found: `description` and `tags` were dropped from BOTH resources

this is the real catch. i compared the vision's prescribed interfaces against the shipped
domain objects field-by-field.

the vision (`1.vision.yield.md`, "contract inputs & outputs") prescribes, for BOTH Plain and
Secure:

```ts
description: string | null;    // roundtrip read-write → required-nullable
tags: DeclaredAwsTags | null;  // roundtrip read-write → required-nullable
// ... nested = { tags }
```

and the vision's OWN day-in-the-life example declares tags on both:

```ts
DeclaredAwsSsmParameterPlain.as({ name: '...', value: 'info',
  tags: { managedBy: 'declastruct', service: 'svc-notifications' } });
DeclaredAwsSsmParameterSecure.as({ name: '...', value: process.env.TWILIO_AUTH_TOKEN,
  tags: { managedBy: 'declastruct', service: 'svc-notifications' } });
```

the SHIPPED objects have NEITHER field:

- `DeclaredAwsSsmParameterPlain.ts:19-50` — fields are only arn, name, value, version,
  lastModifiedAt. no description, no tags, no `nested`.
- `DeclaredAwsSsmParameterSecure.ts:22-59` — fields are only arn, name, value, keyId, version,
  lastModifiedAt. no description, no tags, no `nested`.

both carry the same code comment: "tier, tags, and description are omitted from v1
(add-when-needed)". so this was a CONSCIOUS implementation-time scope cut — but it was NOT one
of the vision's `[answered]` scope cuts (the vision explicitly cut only **tier** and
**StringList**; it never cut tags or description, and it modeled + demoed both).

## why i flag it rather than silently patch it

this is a genuine spec deviation, but the fix is a wisher-level scope call, because the vision
is internally INCONSISTENT and the change has real downstream cost:

1. **internal tension in the vision.** the interface + examples INCLUDE tags. yet the vision's
   IAM section prizes a minimal plan path ("plan can use DescribeParameters ... value read via
   GetParameter where needed") and never grants `ssm:ListTagsForResource` to the plan role. a
   read of tags for drift would add that call + that grant — against the least-privilege story
   the feature exists to sell.
2. **description is nearly free; tags is not.** `DescribeParameters` already returns
   `Description` (no extra call), so description could be added cheaply. tags needs
   `ListTagsForResource` (an extra call + IAM grant) or the write-only-tag treatment.
3. **rule.require.symmetry-with-peer-resources** points the other way: peers like
   `DeclaredAwsIamRole` carry `nested = { tags }`. a declarative resource manager that cannot
   set tags is materially less useful, and the vision clearly wanted them.

because the vision both prescribes tags AND prizes the minimal-call posture, only the wisher
can settle which wins. i do NOT silently add the fields (that would re-open the IAM/cost story
without sign-off) nor silently bury the omission.

## open question for the wisher (the headline)

> the vision's interface + examples include `description` + `tags` on both SSM param
> resources, but the implementation dropped both "for v1". should v1 carry them?
> - **description**: cheap (already in DescribeParameters) — likely yes.
> - **tags**: needs ListTagsForResource + an IAM grant on the plan role, which cuts against the
>   least-privilege posture. add now, defer, or make tags write-only-style (set on apply, not
>   diffed at plan)?

## the rest of the coverage map — verified present

(unchanged from my prior pass, re-confirmed by citation): two resources + daos + provider
registration (`getDeclastructAwsProvider.ts:152-153`) + sdk export + acceptance; write-only
markers (`Secure.ts:83`), cast→undefined (`cast...Secure.ts:31`), findsert no-op
(`set...Secure.ts:51`), create-without-value throw (`:54`), no-GetParameter-at-plan (secure get
→ `describeOneParameter`), plain value-compare (`getOneParameter withDecryption:false`), keyId
default-key fold (`:23`). tier + StringList + hash confirmed absent by design.

## verdict

1 real coverage gap found: `description` + `tags` dropped from both resources vs the vision's
prescribed interface + examples. surfaced as an open [wisher] question (not silently patched)
because the vision is internally inconsistent about it and tags carries an IAM/cost implication
above the blueprint's authority. all other requirements are present and cited.
