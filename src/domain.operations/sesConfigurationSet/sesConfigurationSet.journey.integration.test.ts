import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsSesConfigurationSet } from '@src/domain.objects/DeclaredAwsSesConfigurationSet';

import { delSesConfigurationSet } from './delSesConfigurationSet';
import { getOneSesConfigurationSet } from './getOneSesConfigurationSet';
import { setSesConfigurationSet } from './setSesConfigurationSet';

/**
 * .what = journey test for the ses configuration-set lifecycle (findsert -> get ->
 *   findsert-again -> upsert tags -> del -> del-again) — the sdkSesv2 family's integration proof
 * .why = validates the full plan/apply/idempotency contract against real SES v2. the config set
 *   is the group that captures sent-mail events (send/bounce/complaint/delivery/open/click)
 * .note
 *   - a config-set name is the whole natural key; a uuid suffix keeps runs isolated
 *   - both-ends cleanup: delete before AND after so a crashed run self-heals (del is
 *     idempotent — a no-op if the set is absent), no scene-guard, no skip
 */
describe('sesConfigurationSet.journey', () => {
  const testName = `declastruct-test-cfgset-${genTestUuid().slice(0, 8)}`;

  const testSet = DeclaredAwsSesConfigurationSet.as({
    name: testName,
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delSesConfigurationSet(
      { by: { unique: { name: testName } } },
      context,
    );

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    const context = await getSampleAwsApiContext();
    await delSesConfigurationSet(
      { by: { unique: { name: testName } } },
      context,
    );
  });

  given('[case1] ses configuration set lifecycle', () => {
    const createdSet = useBeforeAll(async () => {
      const { context } = scene;
      return setSesConfigurationSet({ findsert: testSet }, context);
    });

    when('[t1] findsert configuration set', () => {
      then('set is created with the declared name + tags', () => {
        expect(createdSet.name).toBe(testName);
        expect(createdSet.tags).toEqual({
          managedBy: 'declastruct',
          purpose: 'integration-test',
        });
      });
    });

    when('[t2] getOne by unique', () => {
      then('returns the set with its live tags', async () => {
        const { context } = scene;
        const found = await getOneSesConfigurationSet(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(found).not.toBeNull();
        expect(found?.name).toBe(testName);
        expect(found?.tags).toEqual({
          managedBy: 'declastruct',
          purpose: 'integration-test',
        });
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant set unchanged (idempotent)', async () => {
        const { context } = scene;
        const again = await setSesConfigurationSet(
          { findsert: testSet },
          context,
        );
        expect(again.name).toBe(testName);
      });
    });

    when('[t4] upsert with a changed tag set', () => {
      then('reconciles the tags in place (add a tag)', async () => {
        const { context } = scene;
        const retagged = await setSesConfigurationSet(
          {
            upsert: DeclaredAwsSesConfigurationSet.as({
              name: testName,
              tags: {
                managedBy: 'declastruct',
                purpose: 'integration-test',
                tier: 'events',
              },
            }),
          },
          context,
        );
        expect(retagged.tags).toEqual({
          managedBy: 'declastruct',
          purpose: 'integration-test',
          tier: 'events',
        });

        // re-read from AWS to prove it converged (not just the return of the set)
        const reread = await getOneSesConfigurationSet(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(reread?.tags).toEqual({
          managedBy: 'declastruct',
          purpose: 'integration-test',
          tier: 'events',
        });
      });
    });

    when('[t5] del configuration set', () => {
      then('set is removed and getOne returns null', async () => {
        const { context } = scene;
        await delSesConfigurationSet(
          { by: { unique: { name: testName } } },
          context,
        );
        const gone = await getOneSesConfigurationSet(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(gone).toBeNull();
      });
    });

    when('[t6] del again', () => {
      then('is a no-op (idempotent — an absent set converges)', async () => {
        const { context } = scene;
        await expect(
          delSesConfigurationSet(
            { by: { unique: { name: testName } } },
            context,
          ),
        ).resolves.toBeUndefined();
      });
    });
  });
});
