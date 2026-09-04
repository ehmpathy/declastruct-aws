import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';

import { delSnsTopic } from './delSnsTopic';
import { getOneSnsTopic } from './getOneSnsTopic';
import { setSnsTopic } from './setSnsTopic';

/**
 * .what = journey test for the sns topic lifecycle (findsert -> get -> findsert-again ->
 *   upsert tags -> del -> del-again)
 * .why = validates the full plan/apply/idempotency contract against real SNS. the topic is
 *   the event sink a SES configuration-set event destination publishes to, and the optional
 *   receive-notify target of a receipt rule's s3 action
 * .note
 *   - a standard topic can be created by the account for itself in any region
 *   - the arn is deterministic (`arn:aws:sns:<region>:<account>:<name>`), so getOne resolves
 *     the unique name to the primary arn with no list scan
 *   - both-ends cleanup: delete before AND after so a crashed run self-heals (del is
 *     idempotent — a no-op if the topic is absent), no scene-guard, no skip
 */
describe('snsTopic.journey', () => {
  const testName = `declastruct-test-sns-${genTestUuid().slice(0, 8)}`;

  const testTopic = DeclaredAwsSnsTopic.as({
    name: testName,
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // cleanup before: remove any leftover from a prior crashed run
    await delSnsTopic({ by: { unique: { name: testName } } }, context);

    return { context };
  });

  afterAll(async () => {
    // cleanup after: fresh context so teardown runs even if scene setup failed
    const context = await getSampleAwsApiContext();
    await delSnsTopic({ by: { unique: { name: testName } } }, context);
  });

  given('[case1] sns topic lifecycle', () => {
    const createdTopic = useBeforeAll(async () => {
      const { context } = scene;
      return setSnsTopic({ findsert: testTopic }, context);
    });

    when('[t1] findsert topic', () => {
      then(
        'topic is created with a deterministic arn + the declared tags',
        () => {
          expect(createdTopic.name).toBe(testName);
          expect(createdTopic.arn).toContain(`:${testName}`);
          expect(createdTopic.tags).toEqual({
            managedBy: 'declastruct',
            purpose: 'integration-test',
          });
        },
      );
    });

    when('[t2] getOne by unique', () => {
      then('returns the topic with its live arn + tags', async () => {
        const { context } = scene;
        const found = await getOneSnsTopic(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(found).not.toBeNull();
        expect(found?.name).toBe(testName);
        expect(found?.arn).toBe(createdTopic.arn);
        expect(found?.tags).toEqual({
          managedBy: 'declastruct',
          purpose: 'integration-test',
        });
      });
    });

    when('[t3] findsert again', () => {
      then('returns the extant topic unchanged (idempotent)', async () => {
        const { context } = scene;
        const again = await setSnsTopic({ findsert: testTopic }, context);
        expect(again.arn).toBe(createdTopic.arn);
        expect(again.name).toBe(testName);
      });
    });

    when('[t4] upsert with a changed tag set', () => {
      then('reconciles the tags in place (add a tag)', async () => {
        const { context } = scene;
        const retagged = await setSnsTopic(
          {
            upsert: DeclaredAwsSnsTopic.as({
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
        const reread = await getOneSnsTopic(
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

    when('[t5] del topic', () => {
      then('topic is removed and getOne returns null', async () => {
        const { context } = scene;
        await delSnsTopic({ by: { unique: { name: testName } } }, context);
        const gone = await getOneSnsTopic(
          { by: { unique: { name: testName } } },
          context,
        );
        expect(gone).toBeNull();
      });
    });

    when('[t6] del again', () => {
      then('is a no-op (idempotent — an absent topic converges)', async () => {
        const { context } = scene;
        await expect(
          delSnsTopic({ by: { unique: { name: testName } } }, context),
        ).resolves.toBeUndefined();
      });
    });
  });
});
