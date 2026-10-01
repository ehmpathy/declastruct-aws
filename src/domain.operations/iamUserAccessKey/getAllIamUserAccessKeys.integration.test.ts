import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import {
  delTestIamUserThrowaway,
  setTestIamUserThrowaway,
  TEST_IAM_USER_PREFIX,
} from '@src/.test/setTestIamUserThrowaway';

import { getAllIamUserAccessKeys } from './getAllIamUserAccessKeys';

/**
 * .what = integration tests for getAllIamUserAccessKeys
 * .why = validates IAM access key enumeration works against real AWS API
 * .note = the test mints its own throwaway user + key — the demo account holds none, so an
 *   enumeration with no subject would assert only `Array.isArray`. the fixture discards the
 *   key's secret; both-ends cleanup removes key and user
 */
describe('getAllIamUserAccessKeys', () => {
  const testUserName = `${TEST_IAM_USER_PREFIX}keys-${genTestUuid().slice(0, 8)}`;
  const context = useBeforeAll(() => getSampleAwsApiContext());

  const scene = useBeforeAll(async () => {
    await delTestIamUserThrowaway({ name: testUserName }, context);
    return setTestIamUserThrowaway(
      { name: testUserName, withAccessKey: true },
      context,
    );
  });

  afterAll(async () => {
    // fresh context so teardown runs even if setup failed
    const teardownContext = await getSampleAwsApiContext();
    await delTestIamUserThrowaway({ name: testUserName }, teardownContext);
  });

  given('an AWS account that holds one test key', () => {
    when('all access keys for the account are fetched', () => {
      then('the minted key is among them, with its full shape', async () => {
        const keys = await getAllIamUserAccessKeys(
          { by: { account: { id: context.aws.credentials.account } } },
          context,
        );

        const minted = keys.find(
          (key) => key.accessKeyId === scene.accessKeyId,
        );
        expect(minted).toBeDefined();
        expect(minted?.user.username).toBe(testUserName);
        expect(minted).toHaveProperty('status');
        expect(minted).toHaveProperty('createDate');
      });
    });
  });

  given('an IAM user with one access key', () => {
    when('the access keys for that user are fetched', () => {
      then('it returns exactly that user’s one key', async () => {
        const keys = await getAllIamUserAccessKeys(
          {
            by: {
              user: {
                account: { id: context.aws.credentials.account },
                username: testUserName,
              },
            },
          },
          context,
        );

        expect(keys.map((key) => key.accessKeyId)).toEqual([scene.accessKeyId]);
      });
    });
  });
});
