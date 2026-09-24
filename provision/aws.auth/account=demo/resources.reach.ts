import { type DomainEntity, RefByPrimary, refByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';

import {
  type DeclaredAwsIamPolicy,
  DeclaredAwsIamPolicyStatement,
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsIamRolePolicyAttachedManaged,
} from '../../../src/contract/sdks';
import { demoPermissionsPolicy } from '../resources.common';

/**
 * .what = the fix both absent-var throws name, in one place
 * .why = 🔴 this throw gates EVERY apply of `account=demo`, the grove-unrelated ones
 *        included — so it can fire mid-CI-outage on an operator who has no `.env` and
 *        no route into the collaborator's private tree. an error that only says
 *        *"source a file you do not have"* strands them
 * .why = ⇒ so it also names the READ-BACK. both values live in the applied trust
 *        policy, and the demo admin creds this apply already needs carry the
 *        `iam:GetRole` that reads them. neither is a secret — the var is disclosure
 *        control against a PUBLIC git history, never secrecy against our own account
 * .note = one constant, two throws. the hint drifts in one place or in none
 * .note = 🔴 the two flags below each carry load, and a tidy-up that drops either
 *        one re-breaks the operator this hint exists to rescue:
 *        - `--output text` — without it the cli prints JSON, so the read-back yields
 *          `"arn:aws:iam::…"` WITH quotes. an operator pastes that into `.env`, the
 *          quotes ride into the trust principal, and the reach then fails at RUNTIME
 *          with an `AccessDenied` no apply can see (a self-inflicted 4th source of it)
 *        - the quotes around `--query` — `[0]` is a shell glob, so an unquoted value
 *          is at the mercy of the operator's `nullglob`/`failglob` settings
 *        ⇒ the readme block under *"no `.env`, and you need one NOW"* is where those
 *        two flags are explained, and it must stay in step with this string
 * .note = 🟡 "in step" is TOKEN-identical, never BYTE-identical — the readme wraps the
 *        same command across two lines with a `\` continuation, so the bytes differ
 *        by a backslash and a newline. what must match is the token set:
 *        `aws iam get-role --role-name ehmpathy-demo-for-grove`, the quoted
 *        `--query`, and `--output text`
 */
const CAMP_REACH_ENV_HINT =
  "source provision/aws.auth/account=demo/.env — see .env.example. no .env? read both values off the live role: aws iam get-role --role-name ehmpathy-demo-for-grove --query 'Role.AssumeRolePolicyDocument.Statement[0].Principal.AWS' --output text";

/**
 * .what = the role-name placeholder `.env.example` ships, verbatim
 * .why = 🔴 `cp -n .env.example .env && source .env` SETS both vars, so the absent-var
 *        guard passes on a file nobody filled in. that is the likeliest operator slip
 *        of the set, and it is the one an absent-check cannot see by construction
 * .note = it must stay byte-identical to `.env.example`'s value. the account id needs
 *         no twin constant — its 12-digit shape check rejects the placeholder already
 */
const CAMP_REACH_ROLE_NAME_PLACEHOLDER = '__the_camp_grove_role_name__';

/**
 * .what = reads the caller half's identity from the environment, and fails loud if absent
 * .why = 🔴 THIS REPO IS PUBLIC AND THE COLLABORATOR'S IS PRIVATE. their account id
 *        and role name live in `the collaborator's infrastructure repo`, a private tree — so a
 *        constant here would publish another org's identity to the world, which is
 *        their disclosure to make and not ours (fulcrum F3 / F6)
 *
 * .why = the value is NOT a secret — it lands in the applied trust policy and is
 *        readable by anyone with `iam:GetRole` on demo. this is **disclosure
 *        control**, never secrecy: it keeps a foreign org's identity out of a
 *        public git history, and buys naught beyond that
 *
 * .note = the cost of an env var is that the applier's shell decides who may assume
 *         this role, rather than a reviewed commit. that cost is already covered —
 *         every apply here is gated on a PLAN READ (see the revoke note below), and
 *         the resolved principal shows in the plan diff. so a wrong value is caught
 *         by a fail-safe this wish already mandates
 *
 * .note = the vars are named for the REACH, never for the collaborator, so the
 *         collaborator's name is absent from source too
 */
export const getOneCampReachIdentityFromEnv = (): {
  campAccountId: string;
  campGroveRoleName: string;
} => {
  // read both, and fail-fast on absent. each throw names ONLY its own var
  const campAccountId =
    process.env.GROVE_REACH_CAMP_ACCOUNT_ID ??
    BadRequestError.throw('GROVE_REACH_CAMP_ACCOUNT_ID not set', {
      hint: CAMP_REACH_ENV_HINT,
    });
  const campGroveRoleName =
    process.env.GROVE_REACH_CAMP_ROLE_NAME ??
    BadRequestError.throw('GROVE_REACH_CAMP_ROLE_NAME not set', {
      hint: CAMP_REACH_ENV_HINT,
    });

  // 🔴 an aws account id is EXACTLY 12 digits, so a shape check here catches
  // three real operator slips the absent-check above cannot see, and each of
  // them otherwise ships a permanently dead reach that applies perfectly clean:
  //   - the `.env.example` placeholder, left unfilled — `cp` + `source` SETS
  //     the var, so "absent" is false and the guard passes
  //   - a value pasted WITH its json quotes, from a read-back run without
  //     `--output text`
  //   - a truncated or mistyped paste
  if (!/^\d{12}$/.test(campAccountId))
    BadRequestError.throw(
      'GROVE_REACH_CAMP_ACCOUNT_ID is not 12 digits — an aws account id is exactly 12 digits, with no quotes and no arn prefix',
      { hint: CAMP_REACH_ENV_HINT },
    );

  // 🔴 the role name's charset is too permissive to shape-check — the
  // placeholder itself is a LEGAL aws role name — so it is matched by value.
  // this is the copy-but-never-fill slip, which is the likeliest of the set
  if (campGroveRoleName === CAMP_REACH_ROLE_NAME_PLACEHOLDER)
    BadRequestError.throw(
      'GROVE_REACH_CAMP_ROLE_NAME still holds the .env.example placeholder — fill in the real value',
      { hint: CAMP_REACH_ENV_HINT },
    );

  return { campAccountId, campGroveRoleName };
};

/**
 * .what = the name of the demo role a camp grove assumes
 * .why = one role per (target account x collaborator), never one shared role that
 *        carries several parties' trust. a second collaborator earns
 *        `ehmpathy-demo-for-$x`, declared beside this one (fulcrum F11)
 * .note = the collaborator's caller half binds on this name as a literal arn string, so a
 *         rename after their tree merges is a coordinated two-repo change
 */
const DEMO_FOR_GROVE_ROLE_NAME = 'ehmpathy-demo-for-grove';

/**
 * .what = renders one declared managed-policy attachment per arn in a bundle
 * .why = the orchestrator below then states WHAT it declares, rather than a
 *        map + ref composition a reader must simulate to learn as much
 * .note = the arn is the managed policy's PRIMARY key, and the role its UNIQUE
 *         key, so the two refs take different shapes on purpose
 */
const asManagedAttachments = (input: {
  arns: string[];
  role: DeclaredAwsIamRole;
}): DeclaredAwsIamRolePolicyAttachedManaged[] =>
  input.arns.map(
    (arn) =>
      new DeclaredAwsIamRolePolicyAttachedManaged({
        role: refByUnique<typeof DeclaredAwsIamRole>(input.role),
        policy: RefByPrimary.as<typeof DeclaredAwsIamPolicy>({ arn }),
      }),
  );

/**
 * .what = the target half of the camp-grove -> ehmpathy-demo reach
 * .why = a clone on a camp grove holds only its box's badge, which has never
 *        heard of ehmpathy. this role lets that badge reach demo, so a demo task runs
 *        on the box instead of stalling at the first aws call
 *
 * .note = this is one HALF of a two-repo reach. the collaborator's infrastructure repo owns the caller
 *         half — a third `sts:AssumeRole` statement in the camp grove role's
 *         `grove-reach` inline policy, which names our arn. **both halves must be
 *         live**; ours alone applies cleanly and fails at runtime.
 *
 * .note = the arn to hand the collaborator is
 *         `arn:aws:iam::<demo-account-id>:role/ehmpathy-demo-for-grove`
 *         a typo there is a permanently dead reach that BOTH halves apply cleanly into
 *
 * .note = the caller half's identity arrives as an INPUT, never as a constant —
 *         see `getOneCampReachIdentityFromEnv` above for why. it is an input rather
 *         than an env read inside this producer so the declaration stays a pure
 *         function of its arguments, and so a test can drive it with fixtures
 */
export const getResourcesOfReach = async (input: {
  campAccountId: string;
  campGroveRoleName: string;
}): Promise<DomainEntity<any>[]> => {
  // the caller half's arn — two atoms compose it; prose cites the referent, never
  // the value
  const campGroveRoleArn = `arn:aws:iam::${input.campAccountId}:role/${input.campGroveRoleName}`;

  // the role, whose trust policy names the camp grove role and no other principal
  const demoForGroveRole = new DeclaredAwsIamRole({
    name: DEMO_FOR_GROVE_ROLE_NAME,
    path: '/',
    description:
      'Lets a camp grove box run demo-account tasks with its own instance badge, so no ehmpathy credential is hand-carried onto a foreign org host',
    policies: [
      // 🔴 READ BEFORE YOU REVOKE — deletion is NOT a revoke
      //
      // - `DeclaredAwsIamRoleDao` declares `set.delete = null`, so a role removed
      //   from this wish is left in place and declastruct reports no row at all
      // - the role therefore SURVIVES a delete gesture, and its trust policy stays
      //   live along with every session already issued under it
      //
      // to revoke, run TWO applies in this order — never one plan:
      //   1. strip the POWER — delete this role's inline attachment and each of
      //      its managed attachments. both attachment DAOs DO implement
      //      `set.delete`, so this is expressible today. it also reaches a LIVE
      //      session: a trust-policy edit gates only the NEXT `AssumeRole`, so a
      //      token already handed out keeps up to 1h of life, and under this
      //      bundle that tail carries `iam:` writes
      //   2. close re-entry — upsert this `policies` array to a statement that
      //      denies, or to a principal that does not exist. an UPSERT, never a
      //      delete: strip, then rewrite
      //
      //      🔴 in the SAME edit, restate the `description` below and the readme's
      //      intent section. a revoked reach and a not-yet-wired one emit a
      //      BYTE-IDENTICAL AccessDenied, and the only discriminator is whether the
      //      stated intent still matches the trust policy. leave them and the two
      //      cases become indistinguishable.
      //
      // a single plan would run them in declared array order, which is the reverse
      // of the order safety wants, and `applyChange` can throw mid-plan.
      //
      // 🔴 THE EXPECTED PLAN SHAPE — read it BEFORE each apply. THIS is the guard:
      //   apply 1 — DESTROY on the inline attachment AND on each managed
      //             attachment, and no other row
      //   apply 2 — UPDATE on the role alone, every incumbent KEEP
      //
      //   a plan that does not match is a STOP, never a surprise. both intuitive
      //   delete gestures mismatch it: remove-from-wish yields NO row where two
      //   DESTROYs were owed, and `del()` on the role yields DESTROY on the ROLE
      //   where an UPDATE was owed. so the wrong gesture is caught at PLAN, and
      //   the apply that would throw is never run
      //
      //   ⚠️ the ROW COUNTS come from a checked-in artifact, never from this
      //   comment. the declared set is snapped at
      //   `__snapshots__/resources.reach.test.ts.snap` and re-verified on every
      //   commit by `resources.reach.test.ts` [t4]. read it first — a fourth
      //   resource here moves the snapshot and does NOT move this prose
      //
      // ⚠️ step 1 assumes a stripped attachment ends a LIVE session — vision open
      //   question 11(d), UNVERIFIED, since it needs a live reach to test. if it
      //   does not hold, step 1 becomes an inline `Deny *` keyed to
      //   `aws:TokenIssueTime` before the revoke moment, which renders a CREATE
      //   row rather than two DESTROYs. the ORDER and the two applies hold either
      //   way; only apply 1's expected row changes
      //
      // ⚠️ a revoke is also a TWO-REPO act. ours alone leaves a live
      // `sts:AssumeRole` grant in the collaborator's production tree aimed at a role that now
      // denies — the half-wired state their own invariant warns against.
      //
      // ⚠️ and the role NAME is burned afterward. the collaborator's grant binds on our arn
      // STRING; our trust policy binds on their principal's unique id. the two
      // halves bind on different keys, so a same-named role later re-opens the
      // reach with no review on either side.
      //
      // the full procedure, with the commands and the diagnostic table:
      // `.agent/repo=.this/role=any/briefs/howto.revoke-grove-reach.md`
      new DeclaredAwsIamPolicyStatement({
        effect: 'Allow',
        principal: {
          aws: campGroveRoleArn,
        },
        action: 'sts:AssumeRole',
      }),
    ],
    tags: {
      managedBy: 'declastruct',
      purpose: 'grove-reach',
    },
  });

  // the inline permissions — the same bundle cicd reads, unedited
  //
  // .note = the reuse is a ruled decision, not a default. it hands this role
  //   `iam:` writes and `ssm:` command execution on `resource: '*'`, so the
  //   credential can rewrite demo identity and run commands on any demo host.
  //   that residual is ACCEPTED — a demo account needs full access.
  //
  // ⚠️ an edit to `demoPermissionsPolicy` moves this role AND cicd in one commit.
  //   a plan read after such an edit expects TWO update rows, never one.
  //
  // .note = the ATTACHMENT NAME takes the collaborator's `${roleName}-extension` convention
  //   (`provision/aws.auth/resources.reach.ts:150` there), never the incumbent's
  //   literal `ehmpathy-demo-permissions` (`resources.oidc.ts:83`). the unique key
  //   is `[role, name]`, so a reuse would collide with no extant row — and the two
  //   identically named rows in a plan diff would then differ only by a nested
  //   `role` ref, which is the kind of difference a human skims past. every revoke
  //   check below is a human who reads a plan diff for an unexpected row, so the
  //   names must differ at a glance (fulcrum F5)
  const demoForGroveRoleInlinePolicy =
    new DeclaredAwsIamRolePolicyAttachedInline({
      name: `${DEMO_FOR_GROVE_ROLE_NAME}-extension`,
      role: refByUnique<typeof DeclaredAwsIamRole>(demoForGroveRole),
      document: demoPermissionsPolicy.inline,
    });

  // the managed attachments — one per arn the bundle carries, so the set grows
  // with the bundle rather than with this wish
  const demoForGroveRoleManagedPolicies = asManagedAttachments({
    arns: demoPermissionsPolicy.managed,
    role: demoForGroveRole,
  });

  // .note = declastruct applies in DECLARED ARRAY ORDER with no topological sort,
  //   so the role must precede every attachment that references it
  return [
    demoForGroveRole,
    demoForGroveRoleInlinePolicy,
    ...demoForGroveRoleManagedPolicies,
  ];
};
