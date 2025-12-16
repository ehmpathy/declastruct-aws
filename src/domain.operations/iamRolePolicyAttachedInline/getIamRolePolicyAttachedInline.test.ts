import { GetRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import { DeclaredAwsIamRoleDao } from '@src/access/daos/DeclaredAwsIamRoleDao';

import { getIamRolePolicyAttachedInline } from './getIamRolePolicyAttachedInline';

jest.mock('@aws-sdk/client-iam');
jest.mock('../../access/daos/DeclaredAwsIamRoleDao');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getIamRolePolicyAttachedInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('an inline policy that exists', () => {
    when('fetched by unique', () => {
      then('it should return the policy', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
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

        const result = await getIamRolePolicyAttachedInline(
          {
            by: {
              unique: { name: 'permissions', role: { name: 'test-role' } },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.name).toBe('permissions');
        expect(result?.document.statements).toHaveLength(1);
        expect(mockSend).toHaveBeenCalledWith(expect.any(GetRolePolicyCommand));
      });
    });
  });

  given('an inline policy that does not exist', () => {
    when('fetched', () => {
      then('it should return null', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        const error = new Error('NoSuchEntityException');
        error.name = 'NoSuchEntityException';
        mockSend.mockRejectedValue(error);

        const result = await getIamRolePolicyAttachedInline(
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
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue(
          null,
        );

        const result = await getIamRolePolicyAttachedInline(
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
        expect(mockSend).not.toHaveBeenCalled();
      });
    });
  });

  given('an inline policy with conditions', () => {
    when('fetched', () => {
      then('it should preserve conditions', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'oidc-role',
          arn: 'arn:aws:iam::123456789012:role/oidc-role',
        });

        mockSend.mockResolvedValue({
          PolicyDocument: encodeURIComponent(
            JSON.stringify({
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 'sts:AssumeRoleWithWebIdentity',
                  Resource: '*',
                  Condition: {
                    StringEquals: {
                      'token.actions.githubusercontent.com:aud':
                        'sts.amazonaws.com',
                    },
                  },
                },
              ],
            }),
          ),
        });

        const result = await getIamRolePolicyAttachedInline(
          {
            by: {
              unique: { name: 'oidc-permissions', role: { name: 'oidc-role' } },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result!.document.statements[0]!.condition).toMatchObject({
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
        });
      });
    });
  });
});
