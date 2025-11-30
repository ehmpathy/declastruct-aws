import { GetRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import { getIamRolePolicy } from './getIamRolePolicy';

jest.mock('@aws-sdk/client-iam');
jest.mock('../../access/daos/DeclaredAwsIamRoleDao');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

describe('getIamRolePolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a policy that exists', () => {
    when('fetched by unique', () => {
      then('it should return the policy', async () => {
        (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        mockSend.mockResolvedValue({
          PolicyDocument: encodeURIComponent(
            JSON.stringify({
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 's3:GetObject',
                  Resource: '*',
                },
              ],
            }),
          ),
        });

        const result = await getIamRolePolicy(
          {
            by: {
              unique: { name: 'permissions', role: { name: 'test-role' } },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.name).toBe('permissions');
        expect(result?.statements).toHaveLength(1);
        expect(mockSend).toHaveBeenCalledWith(expect.any(GetRolePolicyCommand));
      });
    });
  });

  given('a policy that does not exist', () => {
    when('fetched', () => {
      then('it should return null', async () => {
        (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        const error = new Error('NoSuchEntityException');
        error.name = 'NoSuchEntityException';
        mockSend.mockRejectedValue(error);

        const result = await getIamRolePolicy(
          {
            by: {
              unique: { name: 'nonexistent', role: { name: 'test-role' } },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });

  given('a role that does not exist', () => {
    when('fetched', () => {
      then('it should return null', async () => {
        (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue(null);

        const result = await getIamRolePolicy(
          {
            by: {
              unique: {
                name: 'permissions',
                role: { name: 'nonexistent-role' },
              },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });
});
