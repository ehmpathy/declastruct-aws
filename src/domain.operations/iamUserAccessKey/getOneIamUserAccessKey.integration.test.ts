import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getAllIamUserAccessKeys } from './getAllIamUserAccessKeys';
import { getOneIamUserAccessKey } from './getOneIamUserAccessKey';

/**
 * .what = integration tests for getOneIamUserAccessKey
 * .why = validates IAM access key lookup works against real AWS API
 */
describe('getOneIamUserAccessKey', () => {
  const context = useBeforeAll(() => getSampleAwsApiContext());

  given('an existing access key', () => {
    const scene = useBeforeAll(async () => {
      // get first access key from account
      const keys = await getAllIamUserAccessKeys(
        { by: { account: { id: context.aws.credentials.account } } },
        context,
      );
      if (keys.length === 0)
        return { key: null as (typeof keys)[0] | null, hasKeys: false };
      return { key: keys[0]!, hasKeys: true };
    });

    when('looking up by primary (accessKeyId)', () => {
      then('it should return the key with lastUsed info', async () => {
        if (!scene.hasKeys) {
          console.log('skipping test - no access keys in account');
          return;
        }

        const key = await getOneIamUserAccessKey(
          { by: { primary: { accessKeyId: scene.key!.accessKeyId! } } },
          context,
        );

        expect(key).not.toBeNull();
        expect(key?.accessKeyId).toBe(scene.key!.accessKeyId);
        expect(key?.user).toEqual(scene.key!.user);
        console.log('found key:', {
          accessKeyId: key?.accessKeyId,
          status: key?.status,
          lastUsedDate: key?.lastUsedDate,
          lastUsedService: key?.lastUsedService,
        });
      });
    });

    when('looking up by ref', () => {
      then('it should return the key', async () => {
        if (!scene.hasKeys) {
          console.log('skipping test - no access keys in account');
          return;
        }

        const key = await getOneIamUserAccessKey(
          { by: { ref: { accessKeyId: scene.key!.accessKeyId! } } },
          context,
        );

        expect(key).not.toBeNull();
        expect(key?.accessKeyId).toBe(scene.key!.accessKeyId);
      });
    });
  });

  given('a non-existent access key', () => {
    when('looking up by primary', () => {
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
