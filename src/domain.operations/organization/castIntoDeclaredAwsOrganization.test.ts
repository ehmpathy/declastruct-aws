import type { Organization } from '@aws-sdk/client-organizations';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsOrganization } from './castIntoDeclaredAwsOrganization';

describe('castIntoDeclaredAwsOrganization', () => {
  given('an AWS Organization with all properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsOrganization>;

      then('it should cast', () => {
        const awsOrganization: Organization = {
          Id: 'o-abc123xyz789',
          Arn: 'arn:aws:organizations::123456789012:organization/o-abc123xyz789',
          FeatureSet: 'ALL',
          MasterAccountId: '123456789012',
          MasterAccountArn:
            'arn:aws:organizations::123456789012:account/o-abc123xyz789/123456789012',
          MasterAccountEmail: 'management@example.com',
        };
        result = castIntoDeclaredAwsOrganization(awsOrganization);
      });

      then('it should have all properties mapped', () => {
        expect(result).toMatchObject({
          id: 'o-abc123xyz789',
          arn: 'arn:aws:organizations::123456789012:organization/o-abc123xyz789',
          featureSet: 'ALL',
          managementAccount: {
            id: '123456789012',
          },
        });
      });
    });
  });

  given('an AWS Organization with CONSOLIDATED_BILLING feature set', () => {
    when('cast to domain object', () => {
      then('it should preserve the feature set', () => {
        const awsOrganization: Organization = {
          Id: 'o-billing123',
          Arn: 'arn:aws:organizations::123456789012:organization/o-billing123',
          FeatureSet: 'CONSOLIDATED_BILLING',
          MasterAccountId: '123456789012',
          MasterAccountEmail: 'billing@example.com',
        };

        const result = castIntoDeclaredAwsOrganization(awsOrganization);

        expect(result.featureSet).toBe('CONSOLIDATED_BILLING');
      });
    });
  });

  given('an AWS Organization without Id', () => {
    when('cast to domain object', () => {
      then('it should throw', async () => {
        const awsOrganization = {
          Arn: 'arn:aws:organizations::123456789012:organization/o-abc123xyz789',
          FeatureSet: 'ALL',
          MasterAccountEmail: 'management@example.com',
        } as Organization;

        const error = await getError(() =>
          castIntoDeclaredAwsOrganization(awsOrganization),
        );
        expect(error).toBeDefined();
      });
    });
  });

  given('an AWS Organization without MasterAccountId', () => {
    when('cast to domain object', () => {
      then('it should throw', async () => {
        const awsOrganization = {
          Id: 'o-abc123xyz789',
          Arn: 'arn:aws:organizations::123456789012:organization/o-abc123xyz789',
          FeatureSet: 'ALL',
          // MasterAccountId is missing
        } as Organization;

        const error = await getError(() =>
          castIntoDeclaredAwsOrganization(awsOrganization),
        );
        expect(error).toBeDefined();
      });
    });
  });
});
