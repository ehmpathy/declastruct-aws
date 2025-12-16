import { DetachRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import { DeclaredAwsIamRoleDao } from '@src/access/daos/DeclaredAwsIamRoleDao';

import { delIamRolePolicyAttachedManaged } from './delIamRolePolicyAttachedManaged';

jest.mock('@aws-sdk/client-iam');
jest.mock('../../access/daos/DeclaredAwsIamRoleDao');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('delIamRolePolicyAttachedManaged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a managed policy attachment that exists', () => {
    when('deleted', () => {
      then('it should detach the policy', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        mockSend.mockResolvedValue({});

        await delIamRolePolicyAttachedManaged(
          {
            by: {
              ref: {
                role: { name: 'test-role' },
                policy: { arn: 'arn:aws:iam::123456789012:policy/test-policy' },
              },
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DetachRolePolicyCommand),
        );
      });
    });
  });

  given('an aws-managed policy attachment', () => {
    when('deleted', () => {
      then('it should detach the aws-managed policy', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'admin-role',
          arn: 'arn:aws:iam::123456789012:role/admin-role',
        });

        mockSend.mockResolvedValue({});

        await delIamRolePolicyAttachedManaged(
          {
            by: {
              ref: {
                role: { name: 'admin-role' },
                policy: { arn: 'arn:aws:iam::aws:policy/AdministratorAccess' },
              },
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DetachRolePolicyCommand),
        );
      });
    });
  });

  given('a policy attachment that does not exist', () => {
    when('deleted', () => {
      then('it should succeed silently', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        const error = new Error('NoSuchEntityException');
        error.name = 'NoSuchEntityException';
        mockSend.mockRejectedValue(error);

        // Should not throw
        await expect(
          delIamRolePolicyAttachedManaged(
            {
              by: {
                ref: {
                  role: { name: 'test-role' },
                  policy: {
                    arn: 'arn:aws:iam::123456789012:policy/nonexistent',
                  },
                },
              },
            },
            context,
          ),
        ).resolves.toBeUndefined();
      });
    });
  });

  given('a role that does not exist', () => {
    when('deleting an attachment', () => {
      then('it should succeed silently (attachment already gone)', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue(
          null,
        );

        // Should not throw and should not call IAM
        await expect(
          delIamRolePolicyAttachedManaged(
            {
              by: {
                ref: {
                  role: { name: 'nonexistent-role' },
                  policy: {
                    arn: 'arn:aws:iam::123456789012:policy/test-policy',
                  },
                },
              },
            },
            context,
          ),
        ).resolves.toBeUndefined();

        expect(mockSend).not.toHaveBeenCalled();
      });
    });
  });

  given('a non-unique ref', () => {
    when('deleting an attachment', () => {
      then('it should throw an error', async () => {
        await expect(
          delIamRolePolicyAttachedManaged(
            {
              by: {
                // runtime validation should catch this invalid ref
                ref: { invalidKey: 'test' } as any,
              },
            },
            context,
          ),
        ).rejects.toThrow(
          'policy attachments only support unique ref for deletion',
        );
      });
    });
  });
});
