import {
  AttachRolePolicyCommand,
  IAMClient,
  ListAttachedRolePoliciesCommand,
} from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '../../.test/getMockedAwsApiContext';
import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import { DeclaredAwsIamRolePolicyAttachedManaged } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedManaged';
import { setIamRolePolicyAttachedManaged } from './setIamRolePolicyAttachedManaged';

jest.mock('@aws-sdk/client-iam');
jest.mock('../../access/daos/DeclaredAwsIamRoleDao');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('setIamRolePolicyAttachedManaged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a new managed policy attachment', () => {
    when('findsert is called', () => {
      then('it should attach the policy', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        let callCount = 0;
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof ListAttachedRolePoliciesCommand) {
            callCount++;
            if (callCount === 1) {
              // First check: not attached yet
              return { AttachedPolicies: [] };
            }
            // After attachment: attached
            return {
              AttachedPolicies: [
                {
                  PolicyArn: 'arn:aws:iam::123456789012:policy/test-policy',
                  PolicyName: 'test-policy',
                },
              ],
            };
          }
          if (command instanceof AttachRolePolicyCommand) {
            return {};
          }
          return {};
        });

        const attachment = new DeclaredAwsIamRolePolicyAttachedManaged({
          role: { name: 'test-role' },
          policy: { arn: 'arn:aws:iam::123456789012:policy/test-policy' },
        });

        const result = await setIamRolePolicyAttachedManaged(
          { findsert: attachment },
          context,
        );

        expect(result).not.toBeNull();
        expect(result.policy.arn).toBe(
          'arn:aws:iam::123456789012:policy/test-policy',
        );
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(AttachRolePolicyCommand),
        );
      });
    });
  });

  given('an existing managed policy attachment', () => {
    when('findsert is called', () => {
      then(
        'it should return the existing attachment without reattaching',
        async () => {
          (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
            name: 'test-role',
            arn: 'arn:aws:iam::123456789012:role/test-role',
          });

          mockSend.mockResolvedValue({
            AttachedPolicies: [
              {
                PolicyArn: 'arn:aws:iam::123456789012:policy/existing-policy',
                PolicyName: 'existing-policy',
              },
            ],
          });

          const attachment = new DeclaredAwsIamRolePolicyAttachedManaged({
            role: { name: 'test-role' },
            policy: { arn: 'arn:aws:iam::123456789012:policy/existing-policy' },
          });

          const result = await setIamRolePolicyAttachedManaged(
            { findsert: attachment },
            context,
          );

          expect(result).not.toBeNull();
          // AttachRolePolicyCommand should not have been called
          expect(mockSend).not.toHaveBeenCalledWith(
            expect.any(AttachRolePolicyCommand),
          );
        },
      );
    });
  });

  given('an aws-managed policy', () => {
    when('attaching to a role', () => {
      then('it should attach the aws-managed policy', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'admin-role',
          arn: 'arn:aws:iam::123456789012:role/admin-role',
        });

        let callCount = 0;
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof ListAttachedRolePoliciesCommand) {
            callCount++;
            if (callCount === 1) {
              return { AttachedPolicies: [] };
            }
            return {
              AttachedPolicies: [
                {
                  PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
                  PolicyName: 'AmazonS3FullAccess',
                },
              ],
            };
          }
          if (command instanceof AttachRolePolicyCommand) {
            return {};
          }
          return {};
        });

        const attachment = new DeclaredAwsIamRolePolicyAttachedManaged({
          role: { name: 'admin-role' },
          policy: { arn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
        });

        const result = await setIamRolePolicyAttachedManaged(
          { findsert: attachment },
          context,
        );

        expect(result).not.toBeNull();
        expect(result.policy.arn).toBe(
          'arn:aws:iam::aws:policy/AmazonS3FullAccess',
        );
      });
    });
  });

  given('a role that does not exist', () => {
    when('attaching a policy', () => {
      then('it should throw an error', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue(
          null,
        );

        const attachment = new DeclaredAwsIamRolePolicyAttachedManaged({
          role: { name: 'nonexistent-role' },
          policy: { arn: 'arn:aws:iam::123456789012:policy/test-policy' },
        });

        await expect(
          setIamRolePolicyAttachedManaged({ findsert: attachment }, context),
        ).rejects.toThrow('role not found for policy attachment');
      });
    });
  });

  given('an upsert request', () => {
    when('policy is not attached', () => {
      then('it should attach the policy', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        // upsert doesn't check before, only verifies after
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof ListAttachedRolePoliciesCommand) {
            // After attach, return the attached policy
            return {
              AttachedPolicies: [
                {
                  PolicyArn: 'arn:aws:iam::123456789012:policy/upsert-policy',
                  PolicyName: 'upsert-policy',
                },
              ],
            };
          }
          if (command instanceof AttachRolePolicyCommand) {
            return {};
          }
          return {};
        });

        const attachment = new DeclaredAwsIamRolePolicyAttachedManaged({
          role: { name: 'test-role' },
          policy: { arn: 'arn:aws:iam::123456789012:policy/upsert-policy' },
        });

        const result = await setIamRolePolicyAttachedManaged(
          { upsert: attachment },
          context,
        );

        expect(result).not.toBeNull();
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(AttachRolePolicyCommand),
        );
      });
    });
  });
});
