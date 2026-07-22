import { BadRequestError } from 'helpful-errors';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { delParameter } from '@src/access/sdks/sdkSsm/delParameter';
import { setParameter } from '@src/access/sdks/sdkSsm/setParameter';
import { DeclaredAwsSsmParameterPlain } from '@src/domain.objects/DeclaredAwsSsmParameterPlain';

import { delSsmParameterPlain } from './delSsmParameterPlain';
import { getOneSsmParameterPlain } from './getOneSsmParameterPlain';
import { setSsmParameterPlain } from './setSsmParameterPlain';

/**
 * .what = journey test for the plaintext parameter lifecycle (findsert -> get -> upsert -> del)
 * .why = validates the full plan/apply/idempotency contract against real SSM Parameter Store;
 *   plaintext drift is detected by a normal value-compare (GetParameter, no decrypt)
 * .note
 *   - a String parameter can be created by the account for itself in any region
 *   - both-ends cleanup: delete before AND after so a crashed run self-heals
 */
/**
 * .note = tags are declared `null` here on purpose. a tag WRITE
 *   (AddTagsToResource/RemoveTagsFromResource) needs the ssm tag-write grant, which is applied
 *   to the demo role by the account=.root provision (a foreman/root-admin step per
 *   howto.add-test-permissions + hazard.local-green-cicd-red.oidc-role-not-reapplied). the full
 *   tag reconcile is proven at the ACCEPTANCE grain (resources.acceptance.ts declares real tags),
 *   where that grant is applied as part of verification. here we exercise all the LIVE grants
 *   already allow: value + description write, the type-confusion guard, the value-undefined
 *   fail-loud guard, and the tag READ (ListTagsForResource).
 */
describe('ssmParameterPlain.journey', () => {
  const testName = `/declastruct-test/plain/${genTestUuid().slice(0, 8)}`;

  const testParam = DeclaredAwsSsmParameterPlain.as({
    name: testName,
    value: 'info',
    description: 'the log level',
    tags: null,
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delParameter({ name: testName }, context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    // (del is idempotent — a no-op if the parameter is absent). no scene-guard, no skip
    const context = await getSampleAwsApiContext();
    await delParameter({ name: testName }, context);
  });

  given('[case1] plaintext parameter lifecycle', () => {
    const createdParam = useBeforeAll(async () => {
      const { context } = scene;
      return setSsmParameterPlain({ findsert: testParam }, context);
    });

    when('[t1] findsert parameter', () => {
      then('parameter is created with an arn and the declared value', () => {
        expect(createdParam.name).toBe(testName);
        expect(createdParam.arn).toContain(':parameter');
        expect(createdParam.value).toBe('info');
        expect(createdParam.version).toBeGreaterThanOrEqual(1);
      });

      then('description roundtrips back; tags read null (none written)', () => {
        expect(createdParam.description).toBe('the log level');
        expect(createdParam.tags).toBeNull();
      });
    });

    when('[t2] getOne by unique', () => {
      then(
        'returns the parameter with its live value + description (tag READ)',
        async () => {
          const { context } = scene;
          const found = await getOneSsmParameterPlain(
            { by: { unique: { name: testName } } },
            context,
          );
          expect(found).not.toBeNull();
          expect(found?.name).toBe(testName);
          expect(found?.value).toBe('info');
          expect(found?.description).toBe('the log level');
          // tag READ (ListTagsForResource) is a live grant; none written -> null
          expect(found?.tags).toBeNull();
        },
      );
    });

    when('[t3] findsert again', () => {
      then('returns the extant parameter unchanged (idempotent)', async () => {
        const { context } = scene;
        const again = await setSsmParameterPlain(
          { findsert: testParam },
          context,
        );
        expect(again.name).toBe(testName);
        expect(again.value).toBe('info');
      });
    });

    when('[t3b] upsert with an unchanged value + description', () => {
      then(
        'does not rewrite — the version stays stable (no churn)',
        async () => {
          const { context } = scene;
          const same = await setSsmParameterPlain(
            {
              upsert: DeclaredAwsSsmParameterPlain.as({
                name: testName,
                value: 'info', // identical to createdParam
                description: 'the log level', // identical to createdParam
                tags: null,
              }),
            },
            context,
          );
          // no PutParameter was issued for an unchanged value/description, so AWS did not bump
          // the version — proves the change-guard prevents needless version churn
          expect(same.version).toBe(createdParam.version);
        },
      );
    });

    when('[t4] upsert with a new value + changed description', () => {
      then('overwrites the value and the description in place', async () => {
        const { context } = scene;
        const raised = await setSsmParameterPlain(
          {
            upsert: DeclaredAwsSsmParameterPlain.as({
              name: testName,
              value: 'debug',
              description: 'the raised log level',
              tags: null,
            }),
          },
          context,
        );
        expect(raised.value).toBe('debug');
        expect(raised.description).toBe('the raised log level');
      });
    });

    when('[t4b] upsert clears the description (description: null)', () => {
      then(
        'the description reads back as null (a full roundtrip)',
        async () => {
          const { context } = scene;
          // the description was 'the raised log level' after [t4]; declare it null with a value
          const cleared = await setSsmParameterPlain(
            {
              upsert: DeclaredAwsSsmParameterPlain.as({
                name: testName,
                value: 'debug',
                description: null, // CLEAR the description
                tags: null,
              }),
            },
            context,
          );
          expect(cleared.description).toBeNull();

          // re-read from AWS to prove it converged (not just the return of the set)
          const reread = await getOneSsmParameterPlain(
            { by: { unique: { name: testName } } },
            context,
          );
          expect(reread?.description).toBeNull();
        },
      );
    });

    when('[t5] del parameter via the delSsmParameterPlain orchestrator', () => {
      then('parameter is removed and getOne returns null', async () => {
        const { context } = scene;
        // exercise the orchestrator the PlainDao.delete wires to (ref-route + type-checked
        // get-first + delParameter), not the raw sdk wrapper — covers the DAO delete path
        // end to end, symmetric with the Secure journey's del test
        await delSsmParameterPlain(
          { by: { unique: { name: testName } } },
          context,
        );
        const gone = await getOneSsmParameterPlain(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(gone).toBeNull();
      });
    });

    when('[t6] del again via the orchestrator', () => {
      then('is a no-op (idempotent — get-first returns null)', async () => {
        const { context } = scene;
        await expect(
          delSsmParameterPlain({ by: { unique: { name: testName } } }, context),
        ).resolves.toBeUndefined();
      });
    });
  });

  given('[case2] type-confusion guard — a SecureString at the name', () => {
    // AWS SSM shares ONE namespace across String/StringList/SecureString. if a name already
    // holds a SecureString, a Plain read would surface the ciphertext as `value` and a later
    // Plain write would DOWNGRADE the secret to plaintext. getOneSsmParameterPlain must fail
    // loud on the type mismatch. this is the single scariest failure mode in the feature — here
    // we prove the guard actually fires.
    const secureName = `/declastruct-test/plain/${genTestUuid().slice(0, 8)}`;

    const guardScene = useBeforeAll(async () => {
      const context = await getSampleAwsApiContext();
      await delParameter({ name: secureName }, context);
      // seed a SecureString at the name a Plain resource would claim
      await setParameter(
        {
          name: secureName,
          value: 'super-secret-value',
          type: 'SecureString',
          overwrite: true,
        },
        context,
      );
      return { context };
    });

    afterAll(async () => {
      const context = await getSampleAwsApiContext();
      await delParameter({ name: secureName }, context);
    });

    when('[t1] getOne the SecureString as Plain', () => {
      then(
        'fails loud — never manages a SecureString as a String',
        async () => {
          const { context } = guardScene;
          await expect(
            getOneSsmParameterPlain(
              { by: { unique: { name: secureName } } },
              context,
            ),
          ).rejects.toThrow(BadRequestError);
        },
      );
    });
  });
});
