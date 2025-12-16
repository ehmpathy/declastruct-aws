import { DeleteRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import { DeclaredAwsIamRoleDao } from '@src/access/daos/DeclaredAwsIamRoleDao';

import { delIamRolePolicyAttachedInline } from './delIamRolePolicyAttachedInline';

jest.mock('@aws-sdk/client-iam');
jest.mock('../../access/daos/DeclaredAwsIamRoleDao');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('delIamRolePolicyAttachedInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('an inline policy that exists', () => {
    when('deleted', () => {
      then('it should delete the policy', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        mockSend.mockResolvedValue({});

        await delIamRolePolicyAttachedInline(
          {
            by: {
              ref: { name: 'permissions', role: { name: 'test-role' } },
            },
          },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DeleteRolePolicyCommand),
        );
      });
    });
  });

  given('an inline policy that does not exist', () => {
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
          delIamRolePolicyAttachedInline(
            {
              by: {
                ref: { name: 'nonexistent', role: { name: 'test-role' } },
              },
            },
            context,
          ),
        ).resolves.toBeUndefined();
      });
    });
  });

  given('a role that does not exist', () => {
    when('deleting a policy', () => {
      then('it should succeed silently (policy already gone)', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue(
          null,
        );

        // Should not throw and should not call IAM
        await expect(
          delIamRolePolicyAttachedInline(
            {
              by: {
                ref: {
                  name: 'permissions',
                  role: { name: 'nonexistent-role' },
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
    when('deleting a policy', () => {
      then('it should throw an error', async () => {
        await expect(
          delIamRolePolicyAttachedInline(
            {
              by: {
                // runtime validation should catch this invalid ref
                ref: { invalidKey: 'test' } as any,
              },
            },
            context,
          ),
        ).rejects.toThrow(
          'inline policies only support unique ref for deletion',
        );
      });
    });
  });
});
