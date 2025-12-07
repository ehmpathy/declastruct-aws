import type { Account } from '@aws-sdk/client-organizations';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsOrganizationAccount } from './castIntoDeclaredAwsOrganizationAccount';

describe('castIntoDeclaredAwsOrganizationAccount', () => {
  given('an AWS Account with all properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsOrganizationAccount>;

      then('it should cast', () => {
        const awsAccount: Account = {
          Id: '123456789012',
          Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/123456789012',
          Name: 'test-account',
          Email: 'test@example.com',
          Status: 'ACTIVE',
          JoinedMethod: 'CREATED',
          JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
        };
        result = castIntoDeclaredAwsOrganizationAccount({
          account: awsAccount,
          organization: { managementAccount: { id: '111111111111' } },
          tags: { Environment: 'production' },
        });
      });

      then('it should have all properties mapped', () => {
        expect(result).toMatchObject({
          id: '123456789012',
          arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/123456789012',
          name: 'test-account',
          email: 'test@example.com',
          organization: { managementAccount: { id: '111111111111' } },
          state: 'ACTIVE',
          joinedMethod: 'CREATED',
          tags: { Environment: 'production' },
        });
        expect(result.joinedAt).toBeDefined();
      });
    });
  });

  given('an AWS Account with INVITED joinedMethod', () => {
    when('cast to domain object', () => {
      then('it should preserve the joinedMethod', () => {
        const awsAccount: Account = {
          Id: '222222222222',
          Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/222222222222',
          Name: 'invited-account',
          Email: 'invited@example.com',
          Status: 'ACTIVE',
          JoinedMethod: 'INVITED',
          JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
        };

        const result = castIntoDeclaredAwsOrganizationAccount({
          account: awsAccount,
          organization: { managementAccount: { id: '111111111111' } },
          tags: { Team: 'invited' },
        });

        expect(result.joinedMethod).toBe('INVITED');
      });
    });
  });

  given('an AWS Account with SUSPENDED state', () => {
    when('cast to domain object', () => {
      then('it should preserve the state', () => {
        const awsAccount: Account = {
          Id: '333333333333',
          Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/333333333333',
          Name: 'suspended-account',
          Email: 'suspended@example.com',
          Status: 'SUSPENDED',
          JoinedMethod: 'CREATED',
          JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
        };

        const result = castIntoDeclaredAwsOrganizationAccount({
          account: awsAccount,
          organization: { managementAccount: { id: '111111111111' } },
          tags: { Team: 'suspended' },
        });

        expect(result.state).toBe('SUSPENDED');
      });
    });
  });

  given('an AWS Account without Id', () => {
    when('cast to domain object', () => {
      then('it should throw', async () => {
        const awsAccount = {
          Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/123456789012',
          Name: 'test-account',
          Email: 'test@example.com',
        } as Account;

        const error = await getError(() =>
          castIntoDeclaredAwsOrganizationAccount({
            account: awsAccount,
            organization: { managementAccount: { id: '111111111111' } },
            tags: null,
          }),
        );
        expect(error).toBeDefined();
      });
    });
  });

  given('an AWS Account without Email', () => {
    when('cast to domain object', () => {
      then('it should throw', async () => {
        const awsAccount = {
          Id: '123456789012',
          Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/123456789012',
          Name: 'test-account',
          // Email is missing
        } as Account;

        const error = await getError(() =>
          castIntoDeclaredAwsOrganizationAccount({
            account: awsAccount,
            organization: { managementAccount: { id: '111111111111' } },
            tags: null,
          }),
        );
        expect(error).toBeDefined();
      });
    });
  });

  given('an AWS Account with empty tags', () => {
    when('cast to domain object', () => {
      then('it should have undefined tags', () => {
        const awsAccount: Account = {
          Id: '444444444444',
          Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/444444444444',
          Name: 'notags-account',
          Email: 'notags@example.com',
          Status: 'ACTIVE',
          JoinedMethod: 'CREATED',
          JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
        };

        const result = castIntoDeclaredAwsOrganizationAccount({
          account: awsAccount,
          organization: { managementAccount: { id: '111111111111' } },
          tags: null,
        });

        expect(result.tags).toBeUndefined();
      });
    });
  });

  given('an AWS Account with write-only tags (_decla_writeonly_)', () => {
    when('cast to domain object', () => {
      then('it should extract iamUserAccessToBilling from tags', () => {
        const awsAccount: Account = {
          Id: '555555555555',
          Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/555555555555',
          Name: 'writeonly-account',
          Email: 'writeonly@example.com',
          Status: 'ACTIVE',
          JoinedMethod: 'CREATED',
          JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
        };

        const result = castIntoDeclaredAwsOrganizationAccount({
          account: awsAccount,
          organization: { managementAccount: { id: '111111111111' } },
          tags: {
            _decla_writeonly_iamUserAccessToBilling: 'ALLOW',
            _decla_writeonly_roleName: 'CustomAccessRole',
            Environment: 'production',
          },
        });

        expect(result.iamUserAccessToBilling).toBe('ALLOW');
        expect(result.roleName).toBe('CustomAccessRole');
      });

      then('it should filter out write-only tags from public tags', () => {
        const awsAccount: Account = {
          Id: '555555555555',
          Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/555555555555',
          Name: 'writeonly-account',
          Email: 'writeonly@example.com',
          Status: 'ACTIVE',
          JoinedMethod: 'CREATED',
          JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
        };

        const result = castIntoDeclaredAwsOrganizationAccount({
          account: awsAccount,
          organization: { managementAccount: { id: '111111111111' } },
          tags: {
            _decla_writeonly_iamUserAccessToBilling: 'DENY',
            _decla_writeonly_roleName: 'OrganizationAccountAccessRole',
            Environment: 'production',
            Team: 'platform',
          },
        });

        // write-only tags should not appear in public tags
        expect(result.tags).toEqual({
          Environment: 'production',
          Team: 'platform',
        });
        expect(result.tags).not.toHaveProperty(
          '_decla_writeonly_iamUserAccessToBilling',
        );
        expect(result.tags).not.toHaveProperty('_decla_writeonly_roleName');
      });

      then(
        'it should return undefined tags when only write-only tags exist',
        () => {
          const awsAccount: Account = {
            Id: '666666666666',
            Arn: 'arn:aws:organizations::111111111111:account/o-abc123xyz789/666666666666',
            Name: 'onlywriteonly-account',
            Email: 'onlywriteonly@example.com',
            Status: 'ACTIVE',
            JoinedMethod: 'CREATED',
            JoinedTimestamp: new Date('2024-01-15T10:30:00Z'),
          };

          const result = castIntoDeclaredAwsOrganizationAccount({
            account: awsAccount,
            organization: { managementAccount: { id: '111111111111' } },
            tags: {
              _decla_writeonly_iamUserAccessToBilling: 'ALLOW',
              _decla_writeonly_roleName: 'OrganizationAccountAccessRole',
            },
          });

          // no public tags, so tags should be undefined
          expect(result.tags).toBeUndefined();
          // but write-only values should still be extracted
          expect(result.iamUserAccessToBilling).toBe('ALLOW');
          expect(result.roleName).toBe('OrganizationAccountAccessRole');
        },
      );
    });
  });
});
