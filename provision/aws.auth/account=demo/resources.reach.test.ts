import { type DomainEntity, getUniqueIdentifierSlug } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsIamRolePolicyAttachedManaged,
} from '../../../src/contract/sdks';
import { demoPermissionsPolicy } from '../resources.common';
import {
  getOneCampReachIdentityFromEnv,
  getResourcesOfReach,
} from './resources.reach';

/**
 * .what = a FIXTURE caller identity — deliberately not the real collaborator's
 * .why = 🔴 this repo is PUBLIC and the collaborator's is PRIVATE, so the real
 *        account id and role name are supplied at apply time from `.env` and are
 *        absent from source (`getOneCampReachIdentityFromEnv`). a fixture here
 *        keeps them out of the test file AND out of the snapshot beside it
 * .note = so these asserts pin the SHAPE of the trust statement — one principal,
 *         composed from the two atoms it was given — never a literal arn. that is
 *         the invariant worth a pin: a real arn would pin a value the applier
 *         supplies, which this file cannot know and must not claim to
 */
const CAMP_REACH_IDENTITY_FIXTURE = {
  campAccountId: '000000000000',
  campGroveRoleName: 'example-camp-grove-role',
};

/**
 * .what = whether a declared resource is a policy attachment, of either kind
 * .why = [t3]'s order check selects on this ONE question. named, the selector
 *        reads as the question it asks; inline, it is a two-arm `instanceof`
 *        a reader must evaluate mid-pipeline to learn what the pipeline keeps
 */
const isAttachment = (resource: DomainEntity<any>): boolean =>
  resource instanceof DeclaredAwsIamRolePolicyAttachedInline ||
  resource instanceof DeclaredAwsIamRolePolicyAttachedManaged;

/**
 * .what = the index of every attachment that references the role
 * .why = [t3] asserts the role precedes each of them
 * .note = `flatMap` over map+filter, so the selector is one named question and
 *         one keep/drop — never a `null` sentinel a later filter must strip
 */
const getAllAttachmentIndexes = (input: {
  resources: DomainEntity<any>[];
}): number[] =>
  input.resources.flatMap((resource, index) =>
    isAttachment(resource) ? [index] : [],
  );

/**
 * .what = every managed-policy attachment the declaration carries
 * .why = [t2] asserts one per bundle arn. inline, that is a filter a reader
 *        must simulate to learn which class it selects
 */
const getAllManagedAttachments = (input: {
  resources: DomainEntity<any>[];
}): DeclaredAwsIamRolePolicyAttachedManaged[] =>
  input.resources.filter(
    (resource): resource is DeclaredAwsIamRolePolicyAttachedManaged =>
      resource instanceof DeclaredAwsIamRolePolicyAttachedManaged,
  );

/**
 * .what = the sole inline attachment the declaration carries
 * .why = two asserts in [t2] read it, and a lookup that returned `undefined`
 *        would surface as an opaque `TypeError` at each of them instead of at
 *        the lookup that caused it
 * .note = a type-guard predicate narrows `.find()` at the type level, so this
 *         composes with a fail-fast and needs no `as` cast
 */
const getOneInlineAttachment = (input: {
  resources: DomainEntity<any>[];
}): DeclaredAwsIamRolePolicyAttachedInline =>
  input.resources.find(
    (resource): resource is DeclaredAwsIamRolePolicyAttachedInline =>
      resource instanceof DeclaredAwsIamRolePolicyAttachedInline,
  ) ??
  UnexpectedCodePathError.throw(
    'getResourcesOfReach declared no DeclaredAwsIamRolePolicyAttachedInline. the role would carry the bundle nowhere',
    {
      declared: input.resources.map((resource) => resource.constructor.name),
    },
  );

/**
 * .what = pins the structural invariants of the grove-reach declaration —
 *         [t0] and [t3] carry the four the wish states as acceptance criteria;
 *         [t1] and [t2] carry the role name the collaborator binds on and the ruled
 *         bundle reuse
 * .why = every acceptance row of this wish needs an interactive sso login to
 *        prove, so a driver can prove none of them. these are decidable from
 *        the declared objects alone, with no aws call and no credential, so
 *        they convert four hand-offs into checks that run on every commit
 * .note = a declaration test, never an apply test. it proves what we ASK aws
 *         for; it cannot prove what aws does with the ask
 */
describe('getResourcesOfReach', () => {
  given('[case1] the grove-reach declaration', () => {
    const scene = useBeforeAll(async () => {
      const resources = await getResourcesOfReach(CAMP_REACH_IDENTITY_FIXTURE);

      // ⚠️ fail loud at the LOOKUP, never at the first read of `.policies`. an
      // `as` cast here would let a refactor that drops the role from the array
      // surface as `TypeError: Cannot read properties of undefined` in each of
      // the four asserts below — an opaque failure, four times over, at a
      // location that names neither the cause nor the fix
      const role =
        resources.find(
          (resource): resource is DeclaredAwsIamRole =>
            resource instanceof DeclaredAwsIamRole,
        ) ??
        UnexpectedCodePathError.throw(
          'getResourcesOfReach declared no DeclaredAwsIamRole. the trust policy asserts below have no subject',
          { declared: resources.map((resource) => resource.constructor.name) },
        );

      return { resources, role };
    });

    when('[t0] the trust policy is read', () => {
      then('it holds exactly one statement', () => {
        expect(scene.role.policies).toHaveLength(1);
      });

      // ⚠️ this asserts the arn COMPOSITION, never a literal — the real account id
      // and role name arrive from `.env` at apply time, so a hardcoded arn here
      // would pin a value this file cannot know. what it does pin is the shape:
      // exactly one `aws` principal, built from the two atoms it was handed
      then(
        'that statement names the camp grove role it was given, and only it',
        () => {
          expect(scene.role.policies[0]?.principal).toEqual({
            aws: `arn:aws:iam::${CAMP_REACH_IDENTITY_FIXTURE.campAccountId}:role/${CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName}`,
          });
        },
      );

      then('that statement grants sts:AssumeRole, and only it', () => {
        expect(scene.role.policies[0]?.action).toEqual('sts:AssumeRole');
        expect(scene.role.policies[0]?.effect).toEqual('Allow');
      });

      // a `Condition` would narrow the reach in a way the collaborator's caller half
      // cannot see, so a half-wired reach would deny with no signal on either
      // side. the vision declares the trust statement carries none (fulcrum F9)
      //
      // ⚠️ the length assert carries real weight and is not redundant.
      // `toBeUndefined` passes VACUOUSLY on an empty array, since
      // `policies[0]?.condition` is `undefined` when there is no statement at
      // all — so without this line the assert reads as protection and guards
      // no case. measured: with `policies: []`, 3 of these 4 tests went red
      then('that statement carries no condition', () => {
        expect(scene.role.policies).toHaveLength(1);
        expect(scene.role.policies[0]?.condition).toBeUndefined();
      });
    });

    when('[t1] the role name is read', () => {
      // the collaborator's caller half binds on this as a literal arn STRING, so a
      // rename after their tree merges is a coordinated two-repo change
      then('it is the name the collaborator hardcodes', () => {
        expect(scene.role.name).toEqual('ehmpathy-demo-for-grove');
      });
    });

    when('[t2] the permission attachments are read', () => {
      then('the inline document is the shared bundle, unedited', () => {
        const inline = getOneInlineAttachment({ resources: scene.resources });
        expect(inline.document).toEqual(demoPermissionsPolicy.inline);
      });

      // ⚠️ the NAME is a decided call, never a free one. the unique key is
      // `[role, name]`, so the incumbent's literal `ehmpathy-demo-permissions`
      // would collide with no extant row — and two identically named rows in a
      // plan diff then differ only by a nested `role` ref, the kind of
      // difference a human skims past. every revoke check in the runbook is a
      // human who reads a plan diff, so this assert guards that read (F5)
      then(
        'the inline attachment takes the -extension name, not the incumbent literal',
        () => {
          const inline = getOneInlineAttachment({ resources: scene.resources });
          expect(inline.name).toEqual('ehmpathy-demo-for-grove-extension');
          expect(inline.name).not.toEqual('ehmpathy-demo-permissions');
        },
      );

      // ⚠️ the non-empty assert is what keeps this test honest. the count check
      // alone is RELATIONAL — both sides read 0 if the bundle ever empties, so
      // it would pass while the role carried no managed policy at all
      then('one managed attachment is declared per bundle arn', () => {
        const managed = getAllManagedAttachments({
          resources: scene.resources,
        });
        expect(demoPermissionsPolicy.managed.length).toBeGreaterThan(0);
        expect(managed).toHaveLength(demoPermissionsPolicy.managed.length);
      });
    });

    when('[t3] the apply order is read', () => {
      // declastruct applies in DECLARED ARRAY ORDER with no topological sort,
      // so a role that trailed either attachment would fail at apply
      then('the role precedes every attachment that references it', () => {
        // the scene already resolved the role, so this is an exact reference
        // lookup rather than a predicate a reader must evaluate
        const indexOfRole = scene.resources.indexOf(scene.role);
        const indexesOfAttachments = getAllAttachmentIndexes({
          resources: scene.resources,
        });

        expect(indexOfRole).toEqual(0);
        expect(indexesOfAttachments.length).toBeGreaterThan(0);
        expect(Math.min(...indexesOfAttachments)).toBeGreaterThan(indexOfRole);
      });
    });

    when('[t4] the declared plan shape is read', () => {
      // 🔴 the revoke fail-safe is a HUMAN who compares a real plan to a stated
      // expectation. that expectation is prose in three places — the runbook,
      // the declaration-site note, and `case=7` — and prose in three places
      // drifts. this snapshot is the one place the shape is an ARTIFACT: one
      // row per declared resource, keyed on the same unique identity a plan row
      // is keyed on, in declared apply order
      //
      // ⚠️ it proves the DECLARED shape, never the RENDERED plan. what
      // declastruct does with these resources needs a real apply, which needs an
      // interactive sso login. so it pins the half a driver can pin, and the
      // runbook's revoke tables cite it rather than restate it
      then('it matches the shape the revoke runbook cites', () => {
        expect(
          scene.resources.map((resource) => ({
            kind: resource.constructor.name,
            identity: getUniqueIdentifierSlug(resource),
          })),
        ).toMatchSnapshot();
      });
    });
  });
});

/**
 * .what = sets or clears both camp-reach vars in one call
 * .why = `process.env.X = undefined` stores the STRING `'undefined'`, which is
 *        truthy — so a test that cleared a var that way would assert against a
 *        var that is still set, and pass while it proved nothing. `null` means
 *        `delete`, explicitly
 */
const setCampReachEnv = (input: {
  campAccountId: string | null;
  campGroveRoleName: string | null;
}): void => {
  if (input.campAccountId === null)
    delete process.env.GROVE_REACH_CAMP_ACCOUNT_ID;
  else process.env.GROVE_REACH_CAMP_ACCOUNT_ID = input.campAccountId;

  if (input.campGroveRoleName === null)
    delete process.env.GROVE_REACH_CAMP_ROLE_NAME;
  else process.env.GROVE_REACH_CAMP_ROLE_NAME = input.campGroveRoleName;
};

/**
 * .what = pins the disclosure fix's ONE runtime promise — an absent var fails
 *         loud at plan time, and the throw names both the var and the fix
 * .why = 🔴 that promise is asserted in FOUR places of prose — the readme's
 *        prereq 3, `.env.example`, this function's own jsdoc, and the yield.
 *        prose cannot go red, so this file is the clamp under all four
 * .why = 🔴 and the un-clamped failure mode is SILENT, never loud. drop the
 *        `??` throws and the composition still succeeds: it builds
 *        `arn:aws:iam::undefined:role/undefined` and APPLIES it. that is a
 *        live-looking trust policy naming a principal that cannot exist, so
 *        every assume denies — and it presents as the collaborator's caller half absent
 *        (`readme.md` cause 2), which sends the operator to the wrong repo
 * .note = pure and credential-free, so unlike every acceptance row of this
 *         wish it runs on every commit
 */
describe('getOneCampReachIdentityFromEnv', () => {
  // ⚠️ captured at module scope, restored in `afterAll`. an applier who
  // sourced `.env` before a local test run must find their shell as they left
  // it, and the sibling describe above must not inherit a var this one set
  const campReachEnvBefore = {
    campAccountId: process.env.GROVE_REACH_CAMP_ACCOUNT_ID ?? null,
    campGroveRoleName: process.env.GROVE_REACH_CAMP_ROLE_NAME ?? null,
  };

  afterAll(() => setCampReachEnv(campReachEnvBefore));

  given('[case1] both vars are sourced', () => {
    when('[t0] the identity is read', () => {
      then('it is the pair the shell supplied, unaltered', () => {
        setCampReachEnv(CAMP_REACH_IDENTITY_FIXTURE);
        expect(getOneCampReachIdentityFromEnv()).toEqual(
          CAMP_REACH_IDENTITY_FIXTURE,
        );
      });
    });
  });

  given('[case2] the account id was never sourced', () => {
    when('[t0] the identity is read', () => {
      // ⚠️ three asserts, and each guards a distinct failure. the CLASS keeps
      // it a caller-must-fix (exit 2) rather than a malfunction; the VAR name
      // is what saves the operator a source read; the PATH is the fix itself
      then(
        'it throws BadRequestError, names the var, and names the fix',
        () => {
          setCampReachEnv({
            campAccountId: null,
            campGroveRoleName: CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName,
          });

          const error = getError(() => getOneCampReachIdentityFromEnv());
          expect(error).toBeInstanceOf(BadRequestError);
          expect(error.message).toContain('GROVE_REACH_CAMP_ACCOUNT_ID');
          expect(error.message).toContain(
            'source provision/aws.auth/account=demo/.env',
          );

          // ⚠️ the second half of the fix, and the one that matters at 2am.
          // this throw gates every demo apply, so it fires on operators who
          // have no `.env` and no route into the collaborator's private tree.
          // a hint that only names a file they lack strands them; the
          // read-back is the way through, and it must not be dropped
          expect(error.message).toContain('aws iam get-role');

          // 🔴 and the read-back must be COPY-PASTEABLE, which the assert above
          // cannot check — `aws iam get-role` is present in a degraded variant
          // of the command too. both flags below repair a real 2am failure:
          //   - absent `--output text`, the cli prints JSON, so the operator
          //     reads `"arn:aws:iam::…"` WITH quotes, pastes them into `.env`,
          //     and the quotes ride into the trust principal — which then fails
          //     at RUNTIME with an `AccessDenied` no apply can surface
          //   - unquoted, `[0]` is a shell glob at the mercy of `nullglob`
          // ⇒ these pin the hint byte-for-byte against `readme.md`'s block
          expect(error.message).toContain('--output text');
          expect(error.message).toContain(
            "--query 'Role.AssumeRolePolicyDocument.Statement[0].Principal.AWS'",
          );
        },
      );
    });
  });

  given('[case3] the role name was never sourced', () => {
    when('[t0] the identity is read', () => {
      // ⚠️ the sibling var is SET here on purpose. a throw that fired on
      // either var absent would pass `[case2]` and this case even if it named
      // the wrong one, so each case pins the name of the var IT cleared
      then('it throws and names that var, never the one that is set', () => {
        setCampReachEnv({
          campAccountId: CAMP_REACH_IDENTITY_FIXTURE.campAccountId,
          campGroveRoleName: null,
        });

        const error = getError(() => getOneCampReachIdentityFromEnv());
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('GROVE_REACH_CAMP_ROLE_NAME');
        expect(error.message).not.toContain('GROVE_REACH_CAMP_ACCOUNT_ID');
      });
    });
  });

  // 🔴 every case below SETS both vars, so each one sails past the absent-check
  // above. that is the whole point: `cp -n .env.example .env && source .env`
  // leaves a shell where "absent" is false and the values are still wrong, and
  // the reach that results applies PERFECTLY CLEAN and then fails at runtime
  // with an `AccessDenied` no plan and no test can see. these are the guards
  // that turn a silent dead reach into a loud, named, pre-apply refusal
  given('[case4] the .env.example placeholders were sourced, unfilled', () => {
    when('[t0] the identity is read', () => {
      then('the account id placeholder is refused by its shape', () => {
        setCampReachEnv({
          campAccountId: '__the_camp_account_id__',
          campGroveRoleName: CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName,
        });

        const error = getError(() => getOneCampReachIdentityFromEnv());
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('GROVE_REACH_CAMP_ACCOUNT_ID');
        expect(error.message).toContain('12 digits');
      });

      // ⚠️ the role name is matched BY VALUE, never by shape, because
      // `__the_camp_grove_role_name__` is a legal aws role name — every
      // character of it sits inside the `[\w+=,.@-]{1,64}` charset. so a shape
      // check would pass it, and only the sentinel catches it
      then('the role name placeholder is refused by its value', () => {
        setCampReachEnv({
          campAccountId: CAMP_REACH_IDENTITY_FIXTURE.campAccountId,
          campGroveRoleName: '__the_camp_grove_role_name__',
        });

        const error = getError(() => getOneCampReachIdentityFromEnv());
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('GROVE_REACH_CAMP_ROLE_NAME');
        expect(error.message).toContain('placeholder');
      });
    });
  });

  given('[case5] the account id was pasted with its json quotes', () => {
    when('[t0] the identity is read', () => {
      // 🔴 this is the exact residue of a read-back run WITHOUT `--output text`.
      // so this case and the hint's `--output text` assert are two nets under
      // one slip — belt and braces, on purpose
      then('it is refused, and the message says no quotes', () => {
        setCampReachEnv({
          campAccountId: `"${CAMP_REACH_IDENTITY_FIXTURE.campAccountId}"`,
          campGroveRoleName: CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName,
        });

        const error = getError(() => getOneCampReachIdentityFromEnv());
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('no quotes');
      });
    });
  });

  given('[case6] the whole arn was pasted where the id was wanted', () => {
    when('[t0] the identity is read', () => {
      then('it is refused, and the message says no arn prefix', () => {
        setCampReachEnv({
          campAccountId: `arn:aws:iam::${CAMP_REACH_IDENTITY_FIXTURE.campAccountId}:role/${CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName}`,
          campGroveRoleName: CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName,
        });

        const error = getError(() => getOneCampReachIdentityFromEnv());
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('no arn prefix');
      });
    });
  });

  // 🔴 every case above asserts with `toContain`, and that is not enough on its
  // own for THIS contract. a `toContain` pins that a fragment is PRESENT; it
  // cannot see a reorder, a reword around the fragment, or a duplicated clause.
  // ⇒ so a message could degrade badly and still hold every asserted fragment
  //
  // ⚠️ and this message is not ordinary prose — it is the one text an operator
  // reads mid-outage. it fires at plan time on EVERY `account=demo` apply, the
  // grove-unrelated oidc CI repair included, and the whole `errors-name-the-fix`
  // claim of this provision rests on its exact bytes
  //
  // ⇒ the snapshot is what makes a drift in the operator contract a RED DIFF a
  // reviewer sees, rather than a green suite. the asserts stay: per
  // `rule.require.snapshots`, the snapshot buys visual review and the explicit
  // asserts buy the functional check. neither stands alone
  given('[case7] every user-faced failure variant', () => {
    when('[t0] each is triggered in turn', () => {
      // ⚠️ the fixture is `000000000000` / `example-camp-grove-role`, so no line
      // of the snapshot this emits carries the collaborator's real identity —
      // which is what lets this file live in a PUBLIC repo at all
      const variants: {
        variant: string;
        campAccountId: string | null;
        campGroveRoleName: string | null;
      }[] = [
        {
          variant: 'account id absent',
          campAccountId: null,
          campGroveRoleName: CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName,
        },
        {
          variant: 'role name absent',
          campAccountId: CAMP_REACH_IDENTITY_FIXTURE.campAccountId,
          campGroveRoleName: null,
        },
        {
          variant: 'account id placeholder, unfilled',
          campAccountId: '__the_camp_account_id__',
          campGroveRoleName: CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName,
        },
        {
          variant: 'role name placeholder, unfilled',
          campAccountId: CAMP_REACH_IDENTITY_FIXTURE.campAccountId,
          campGroveRoleName: '__the_camp_grove_role_name__',
        },
        {
          variant: 'account id pasted with json quotes',
          campAccountId: `"${CAMP_REACH_IDENTITY_FIXTURE.campAccountId}"`,
          campGroveRoleName: CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName,
        },
        {
          variant: 'whole arn pasted where the id was wanted',
          campAccountId: `arn:aws:iam::${CAMP_REACH_IDENTITY_FIXTURE.campAccountId}:role/${CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName}`,
          campGroveRoleName: CAMP_REACH_IDENTITY_FIXTURE.campGroveRoleName,
        },
      ];

      then('the operator-faced text matches the snapshot, per variant', () => {
        const captured = variants.map((each) => {
          setCampReachEnv({
            campAccountId: each.campAccountId,
            campGroveRoleName: each.campGroveRoleName,
          });
          const error = getError(() => getOneCampReachIdentityFromEnv());
          return {
            variant: each.variant,
            kind: error.constructor.name,
            message: error.message,
          };
        });

        expect(captured).toMatchSnapshot();
      });

      // ⚠️ the snapshot alone cannot prove the CLASS is right — it records
      // whatever name was thrown. this pins the contract that matters to a
      // caller: exit 2, caller-must-fix, never a malfunction
      then('every variant is a caller-must-fix, never a malfunction', () => {
        variants.forEach((each) => {
          setCampReachEnv({
            campAccountId: each.campAccountId,
            campGroveRoleName: each.campGroveRoleName,
          });
          expect(
            getError(() => getOneCampReachIdentityFromEnv()),
          ).toBeInstanceOf(BadRequestError);
        });
      });
    });
  });
});
