import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import {
  delTestIamUserThrowaway,
  setTestIamUserThrowaway,
  TEST_IAM_USER_PREFIX,
} from '@src/.test/setTestIamUserThrowaway';

import { getOneIamUserAccessKey } from './getOneIamUserAccessKey';

/**
 * .what = integration tests for getOneIamUserAccessKey
 * .why = validates IAM access key lookup works against real AWS API
 * .note = the test mints its own throwaway user + key — the demo account holds none, and a
 *   lookup test with no subject proves no behavior. the key's secret is discarded by the
 *   fixture; both-ends cleanup removes key and user
 */
describe('getOneIamUserAccessKey', () => {
  const testUserName = `${TEST_IAM_USER_PREFIX}key-${genTestUuid().slice(0, 8)}`;
  const context = useBeforeAll(() => getSampleAwsApiContext());

  afterAll(async () => {
    // fresh context so teardown runs even if setup failed
    const teardownContext = await getSampleAwsApiContext();
    await delTestIamUserThrowaway({ name: testUserName }, teardownContext);
  });

  given('an extant access key', () => {
    const scene = useBeforeAll(async () => {
      await delTestIamUserThrowaway({ name: testUserName }, context);
      const created = await setTestIamUserThrowaway(
        { name: testUserName, withAccessKey: true },
        context,
      );
      if (!created.accessKeyId)
        throw new Error('fixture minted no access key for the key lookup');
      return { accessKeyId: created.accessKeyId };
    });

    when('a lookup by primary (accessKeyId)', () => {
      then('it should return the key with lastUsed info', async () => {
        const key = await getOneIamUserAccessKey(
          { by: { primary: { accessKeyId: scene.accessKeyId } } },
          context,
        );

        expect(key).not.toBeNull();
        expect(key?.accessKeyId).toBe(scene.accessKeyId);
        // the full owner ref, account included — the pre-fixture test compared the whole `user`
        expect(key?.user).toEqual({
          account: { id: context.aws.credentials.account },
          username: testUserName,
        });
      });
    });

    when('a lookup by ref', () => {
      then('it should return the key', async () => {
        const key = await getOneIamUserAccessKey(
          { by: { ref: { accessKeyId: scene.accessKeyId } } },
          context,
        );

        expect(key).not.toBeNull();
        expect(key?.accessKeyId).toBe(scene.accessKeyId);
      });
    });
  });

  given('a non-existent access key', () => {
    when('a lookup by primary', () => {
      then('it should return null', async () => {
        const key = await getOneIamUserAccessKey(
          { by: { primary: { accessKeyId: 'AKIAIOSFODNN0EXAMPLE' } } },
          context,
        );

        expect(key).toBeNull();
      });
    });
  });
});
