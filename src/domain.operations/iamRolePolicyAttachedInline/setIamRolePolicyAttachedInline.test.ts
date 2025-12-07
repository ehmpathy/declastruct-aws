import {
  GetRolePolicyCommand,
  IAMClient,
  PutRolePolicyCommand,
} from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '../../.test/getMockedAwsApiContext';
import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import { DeclaredAwsIamRolePolicyAttachedInline } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedInline';
import { setIamRolePolicyAttachedInline } from './setIamRolePolicyAttachedInline';

jest.mock('@aws-sdk/client-iam');
jest.mock('../../access/daos/DeclaredAwsIamRoleDao');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('setIamRolePolicyAttachedInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a new inline policy to create', () => {
    when('finsert is called', () => {
      then('it should create the policy', async () => {
        (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        // First call for check (not exists), second for verification after create
        let callCount = 0;
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof GetRolePolicyCommand) {
            callCount++;
            if (callCount === 1) {
              const error = new Error('NoSuchEntityException');
              error.name = 'NoSuchEntityException';
              throw error;
            }
            // After creation, return the policy
            return {
              PolicyDocument: encodeURIComponent(
                JSON.stringify({
                  Version: '2012-10-17',
                  Statement: [
                    { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' },
                  ],
                }),
              ),
            };
          }
          if (command instanceof PutRolePolicyCommand) {
            return {};
          }
          return {};
        });

        const policy = new DeclaredAwsIamRolePolicyAttachedInline({
          name: 'permissions',
          role: { name: 'test-role' },
          document: {
            statements: [
              {
                effect: 'Allow',
                action: 's3:GetObject',
                resource: '*',
              },
            ],
          },
        });

        const result = await setIamRolePolicyAttachedInline(
          { finsert: policy },
          context,
        );

        expect(result).not.toBeNull();
        expect(result.name).toBe('permissions');
        expect(mockSend).toHaveBeenCalledWith(expect.any(PutRolePolicyCommand));
      });
    });
  });

  given('an existing inline policy', () => {
    when('finsert is called', () => {
      then(
        'it should return the existing policy without updating',
        async () => {
          (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue({
            name: 'test-role',
            arn: 'arn:aws:iam::123456789012:role/test-role',
          });

          // Policy already exists
          mockSend.mockResolvedValue({
            PolicyDocument: encodeURIComponent(
              JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                  { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' },
                ],
              }),
            ),
          });

          const policy = new DeclaredAwsIamRolePolicyAttachedInline({
            name: 'existing-permissions',
            role: { name: 'test-role' },
            document: {
              statements: [
                {
                  effect: 'Allow',
                  action: 's3:PutObject', // different action
                  resource: '*',
                },
              ],
            },
          });

          const result = await setIamRolePolicyAttachedInline(
            { finsert: policy },
            context,
          );

          expect(result).not.toBeNull();
          // Should return existing policy, not update with new statements
          expect(result.document.statements[0]!.action).toBe('s3:GetObject');
          // PutRolePolicyCommand should not have been called
          expect(mockSend).not.toHaveBeenCalledWith(
            expect.any(PutRolePolicyCommand),
          );
        },
      );
    });
  });

  given('an existing inline policy to update', () => {
    when('upsert is called', () => {
      then('it should update the policy', async () => {
        (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof GetRolePolicyCommand) {
            return {
              PolicyDocument: encodeURIComponent(
                JSON.stringify({
                  Version: '2012-10-17',
                  Statement: [
                    { Effect: 'Allow', Action: 's3:PutObject', Resource: '*' },
                  ],
                }),
              ),
            };
          }
          if (command instanceof PutRolePolicyCommand) {
            return {};
          }
          return {};
        });

        const policy = new DeclaredAwsIamRolePolicyAttachedInline({
          name: 'permissions',
          role: { name: 'test-role' },
          document: {
            statements: [
              {
                effect: 'Allow',
                action: 's3:PutObject',
                resource: '*',
              },
            ],
          },
        });

        const result = await setIamRolePolicyAttachedInline(
          { upsert: policy },
          context,
        );

        expect(result).not.toBeNull();
        expect(mockSend).toHaveBeenCalledWith(expect.any(PutRolePolicyCommand));
      });
    });
  });

  given('a role that does not exist', () => {
    when('creating a policy', () => {
      then('it should throw an error', async () => {
        (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue(null);

        const policy = new DeclaredAwsIamRolePolicyAttachedInline({
          name: 'permissions',
          role: { name: 'nonexistent-role' },
          document: {
            statements: [
              {
                effect: 'Allow',
                action: 's3:GetObject',
                resource: '*',
              },
            ],
          },
        });

        await expect(
          setIamRolePolicyAttachedInline({ finsert: policy }, context),
        ).rejects.toThrow('role not found for policy attachment');
      });
    });
  });
});
