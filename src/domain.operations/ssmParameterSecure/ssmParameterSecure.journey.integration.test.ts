import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { BadRequestError } from 'helpful-errors';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { delParameter } from '@src/access/sdks/sdkSsm/delParameter';
import { listOneParameterTags } from '@src/access/sdks/sdkSsm/listOneParameterTags';
import { setParameter } from '@src/access/sdks/sdkSsm/setParameter';
import { DeclaredAwsSsmParameterSecure } from '@src/domain.objects/DeclaredAwsSsmParameterSecure';

import { delSsmParameterSecure } from './delSsmParameterSecure';
import { getOneSsmParameterSecure } from './getOneSsmParameterSecure';
import { setSsmParameterSecure } from './setSsmParameterSecure';

/**
 * .what = journey test for the secret parameter lifecycle (write-only, replicates github)
 * .why = validates the full plan/apply/idempotency contract against real SSM Parameter Store,
 *   AND proves the core security guarantee: plan (getOne) issues NO GetParameter — so no
 *   value is ever read back and no kms:Decrypt is needed
 * .note
 *   - a SecureString parameter can be created by the account for itself in any region
 *   - both-ends cleanup: delete before AND after so a crashed run self-heals
 */
describe('ssmParameterSecure.journey', () => {
  const testName = `/declastruct-test/secure/${genTestUuid().slice(0, 8)}`;

  // .note = tags are declared `null` on purpose — a tag WRITE needs the ssm tag-write grant
  //   applied by the account=.root provision (root-admin step). the full tag reconcile is proven
  //   at the ACCEPTANCE grain, where that grant is applied. here we exercise the LIVE-grant
  //   paths: value + description write, the metadata-only plan read (no GetParameter), the
  //   type-confusion guard, and the value-undefined fail-loud guard.
  const testSecret = DeclaredAwsSsmParameterSecure.as({
    name: testName,
    value: 'super-secret-value',
    keyId: null, // account default aws/ssm key
    description: 'the api token',
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
    // (del is idempotent — a no-op if the secret is absent). no scene-guard, no skip
    const context = await getSampleAwsApiContext();
    await delParameter({ name: testName }, context);
  });

  given('[case1] secret parameter lifecycle', () => {
    const createdSecret = useBeforeAll(async () => {
      const { context } = scene;
      return setSsmParameterSecure({ findsert: testSecret }, context);
    });

    when('[t1] findsert secret with a value', () => {
      then('secret is created with an arn and metadata only (no value)', () => {
        expect(createdSecret.name).toBe(testName);
        expect(createdSecret.arn).toContain(':parameter');
        expect(createdSecret.version).toBeGreaterThanOrEqual(1);
        // write-only: the value is NEVER read back
        expect(createdSecret.value).toBeUndefined();
      });
    });

    when('[t1b] findsert result carries roundtrip description', () => {
      then(
        'description reads back (metadata only, no value); tags null',
        () => {
          expect(createdSecret.description).toBe('the api token');
          expect(createdSecret.tags).toBeNull();
        },
      );
    });

    when('[t2] getOne by unique (plan)', () => {
      then(
        'reconciles via metadata only — issues NO GetParameter',
        async () => {
          const { context } = scene;

          // the spy calls through to the real send by default (jest.spyOn), yet records calls
          const sendSpy = jest.spyOn(SSMClient.prototype, 'send');
          try {
            const found = await getOneSsmParameterSecure(
              { by: { unique: { name: testName } } },
              context,
            );

            // the guarantee: no GetParameterCommand was ever issued for the plan read
            const usedGetParameter = sendSpy.mock.calls.some(
              ([command]) => command instanceof GetParameterCommand,
            );
            expect(usedGetParameter).toBe(false);

            // metadata + roundtrip fields present, the value is NOT (write-only)
            expect(found).not.toBeNull();
            expect(found?.name).toBe(testName);
            expect(found?.value).toBeUndefined();
            expect(found?.description).toBe('the api token');
            // tag READ (ListTagsForResource) is a live grant; none written -> null
            expect(found?.tags).toBeNull();
          } finally {
            sendSpy.mockRestore();
          }
        },
      );
    });

    when('[t3] findsert again with value undefined (steady state)', () => {
      then('returns the extant secret unchanged (KEEP, no read)', async () => {
        const { context } = scene;
        const kept = await setSsmParameterSecure(
          {
            findsert: DeclaredAwsSsmParameterSecure.as({
              name: testName,
              value: undefined,
              keyId: null,
              description: 'the api token',
              tags: null,
            }),
          },
          context,
        );
        expect(kept.name).toBe(testName);
        expect(kept.value).toBeUndefined();
      });
    });

    when('[t4] findsert again with a value present', () => {
      then(
        'still a no-op — findsert never rotates an extant secret',
        async () => {
          const { context } = scene;
          const kept = await setSsmParameterSecure(
            { findsert: testSecret },
            context,
          );
          // version unchanged proves no rewrite happened
          expect(kept.version).toBe(createdSecret.version);
        },
      );
    });

    when('[t5] upsert with a new value (rotate)', () => {
      then('rewrites the secret and the version increments', async () => {
        const { context } = scene;
        const rotated = await setSsmParameterSecure(
          {
            upsert: DeclaredAwsSsmParameterSecure.as({
              name: testName,
              value: 'rotated-secret-value',
              keyId: null,
              description: 'the api token',
              tags: null,
            }),
          },
          context,
        );
        expect(rotated.value).toBeUndefined(); // still write-only
        expect(rotated.version).toBeGreaterThan(createdSecret.version ?? 0);
      });
    });

    when('[t5b] upsert changes description with value undefined', () => {
      then(
        'fails loud — a SecureString re-encrypts only on a value write',
        async () => {
          const { context } = scene;
          await expect(
            setSsmParameterSecure(
              {
                upsert: DeclaredAwsSsmParameterSecure.as({
                  name: testName,
                  value: undefined, // NO value
                  keyId: null,
                  description: 'a changed description', // change needs a value
                  tags: null,
                }),
              },
              context,
            ),
          ).rejects.toThrow(BadRequestError);
        },
      );
    });

    when('[t5c] upsert changes keyId with value undefined', () => {
      then(
        'fails loud — the keyId arm of the guard, distinct from description',
        async () => {
          const { context } = scene;
          // the guard is a pure comparison in the orchestrator on the value-undefined path, so
          // it throws BEFORE any AWS call — the keyId need not name a real key to prove the arm
          await expect(
            setSsmParameterSecure(
              {
                upsert: DeclaredAwsSsmParameterSecure.as({
                  name: testName,
                  value: undefined, // NO value
                  keyId: 'alias/some-other-key', // differs from the seeded null (default key)
                  description: 'the api token', // description UNCHANGED — isolate the keyId arm
                  tags: null,
                }),
              },
              context,
            ),
          ).rejects.toThrow(BadRequestError);
        },
      );
    });

    when(
      '[t5d] upsert clears the description (description: null + a value)',
      () => {
        then(
          'the description reads back as null (a full roundtrip)',
          async () => {
            const { context } = scene;
            // a SecureString needs a value write to change the description, so supply one and clear
            // the description in the same write; the write-only value is never read back
            const cleared = await setSsmParameterSecure(
              {
                upsert: DeclaredAwsSsmParameterSecure.as({
                  name: testName,
                  value: 'value-for-the-clear-write',
                  keyId: null,
                  description: null, // CLEAR the description
                  tags: null,
                }),
              },
              context,
            );
            expect(cleared.description).toBeNull();

            // re-read from AWS (metadata only) to prove it converged, not just the set return
            const reread = await getOneSsmParameterSecure(
              { by: { unique: { name: testName } } },
              context,
            );
            expect(reread?.description).toBeNull();
          },
        );
      },
    );

    when('[t6] del secret via the delSsmParameterSecure orchestrator', () => {
      then('secret is removed and getOne returns null', async () => {
        const { context } = scene;
        // exercise the orchestrator the SecureDao.delete wires to (ref-route + delParameter),
        // not the raw sdk wrapper — this covers the DAO delete path end to end
        await delSsmParameterSecure(
          { by: { unique: { name: testName } } },
          context,
        );
        const gone = await getOneSsmParameterSecure(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(gone).toBeNull();
      });
    });
  });

  given('[case2] create-without-value guard', () => {
    const guardName = `/declastruct-test/secure/${genTestUuid().slice(0, 8)}`;

    afterAll(async () => {
      const context = await getSampleAwsApiContext();
      await delParameter({ name: guardName }, context);
    });

    when('[t1] findsert an absent secret with no value', () => {
      then(
        'throws a BadRequestError — a value is required to create',
        async () => {
          const { context } = scene;
          await expect(
            setSsmParameterSecure(
              {
                findsert: DeclaredAwsSsmParameterSecure.as({
                  name: guardName,
                  value: undefined,
                  keyId: null,
                  description: null,
                  tags: null,
                }),
              },
              context,
            ),
          ).rejects.toThrow(BadRequestError);
        },
      );
    });
  });

  given('[case3] type-confusion guard — a String at the name', () => {
    // the mirror of the Plain guard: if a name already holds a plaintext String, a Secure
    // resource must NOT adopt it — a metadata read that assumed SecureString would let a later
    // no-value KEEP hide a plaintext value that was never encrypted. getOneSsmParameterSecure
    // must fail loud on the type mismatch.
    const plainName = `/declastruct-test/secure/${genTestUuid().slice(0, 8)}`;

    const guardScene = useBeforeAll(async () => {
      const context = await getSampleAwsApiContext();
      await delParameter({ name: plainName }, context);
      // seed a plaintext String at the name a Secure resource would claim
      await setParameter(
        {
          name: plainName,
          value: 'not-a-secret',
          type: 'String',
          overwrite: true,
        },
        context,
      );
      return { context };
    });

    afterAll(async () => {
      const context = await getSampleAwsApiContext();
      await delParameter({ name: plainName }, context);
    });

    when('[t1] getOne the String as Secure', () => {
      then(
        'fails loud — never manages a String as a SecureString',
        async () => {
          const { context } = guardScene;
          await expect(
            getOneSsmParameterSecure(
              { by: { unique: { name: plainName } } },
              context,
            ),
          ).rejects.toThrow(BadRequestError);
        },
      );
    });
  });

  given('[case4] tag reconcile — drop a key', () => {
    // the tag-REMOVE arm (RemoveTagsFromResource): seed a secret WITH an extra tag key, then
    // upsert WITHOUT it, and assert via ListTagsForResource that the dropped key is gone and the
    // kept keys remain. this is the only test that exercises the remove arm against real aws —
    // it needs the ssm tag-write grant on the demo roles (applied by the account=.root +
    // account=demo provisions), the same grant the whole tag story relies on.
    const tagName = `/declastruct-test/secure/${genTestUuid().slice(0, 8)}`;

    const outcome = useBeforeAll(async () => {
      const context = await getSampleAwsApiContext();

      // cleanup before: remove any leftover from a prior crashed run
      await delParameter({ name: tagName }, context);

      // seed the secret with THREE tags (a value write is required to create a SecureString)
      await setSsmParameterSecure(
        {
          upsert: DeclaredAwsSsmParameterSecure.as({
            name: tagName,
            value: 'tag-remove-seed-secret',
            keyId: null,
            description: null,
            tags: {
              managedBy: 'declastruct',
              purpose: 'integration-test',
              temp: 'to-be-removed',
            },
          }),
        },
        context,
      );

      // upsert again with the SAME value but the 'temp' key DROPPED — exercises the remove arm
      await setSsmParameterSecure(
        {
          upsert: DeclaredAwsSsmParameterSecure.as({
            name: tagName,
            value: 'tag-remove-seed-secret',
            keyId: null,
            description: null,
            tags: {
              managedBy: 'declastruct',
              purpose: 'integration-test',
            },
          }),
        },
        context,
      );

      // read the live tags back to prove the reconcile converged
      const tags = await listOneParameterTags({ name: tagName }, context);
      return { tags };
    });

    afterAll(async () => {
      const context = await getSampleAwsApiContext();
      await delParameter({ name: tagName }, context);
    });

    when('[t1] the secret is upserted with a tag key dropped', () => {
      then('the dropped key is gone and the kept keys remain', () => {
        expect(outcome.tags).not.toBeNull();
        expect(outcome.tags).toHaveProperty('managedBy', 'declastruct');
        expect(outcome.tags).toHaveProperty('purpose', 'integration-test');
        expect(outcome.tags).not.toHaveProperty('temp');
      });
    });
  });
});
