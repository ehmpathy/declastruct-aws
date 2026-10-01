# drive log — 2026-09-27 — stones 5.1 → 5.3

## 5.1 execution — PASSED (overruled by human)
- r011 i019 mis-tally: guard read `0 blockers` from quoted prose; the review raised a real blocker
  (case=7 rung 2). fixed: `getBucketNotEmptyError.ts` wired into `delBucket.ts`
- r011 i020 role confusion, i021 21-min timeout — both malfunctions, absorbed
- nitpicks 16 > 7 sat in exhausted lanes; absorb does not discount them. human overruled

## 5.3 verification — IN PROGRESS (self-review 1/8 promised; 2/8 blocked on an apply)
fixed:
- `DeclaredAwsS3BucketLifecycle.types.test.ts` — compile-time guarantees (c11, F18/I-9, A-1);
  proven non-hollow by a removed directive → `TS2322`
- F8 symmetry: `getS3BucketUnmodeledValueError.ts` + `assureS3BucketModeledValue` for version
  state AND storage class
- `package.json`: `test:unit`/`test:integration` now honor `$RESNAP`
- `s3Bucket.journey` [t3b]: A-5 CLOSED live — `NoSuchPublicAccessBlockConfiguration`, 404
- 5 iam lookup tests ran zero assertions (early `return` on an empty account). now on
  `src/.test/setTestIamUserThrowaway.ts`; grant `iam:CreateUser/DeleteUser/TagUser` on
  `user/declastruct-test-*` declared in `provision/aws.auth/resources.common.ts`

open:
- ⏳ human `account=demo` apply of that grant (measured AccessDenied on iam:CreateUser)
- 20 `runIf` skips: 11 org-management creds, 9 private grove values — foreman-held
- self-reviews 2–8
- no commit yet
