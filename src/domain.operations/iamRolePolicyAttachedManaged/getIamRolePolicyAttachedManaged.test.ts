import {
  IAMClient,
  ListAttachedRolePoliciesCommand,
} from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '../../.test/getMockedAwsApiContext';
import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import { getIamRolePolicyAttachedManaged } from './getIamRolePolicyAttachedManaged';

jest.mock('@aws-sdk/client-iam');
jest.mock('../../access/daos/DeclaredAwsIamRoleDao');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getIamRolePolicyAttachedManaged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a managed policy attachment that exists', () => {
    when('fetched by unique', () => {
      then('it should return the attachment', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        mockSend.mockResolvedValue({
          AttachedPolicies: [
            {
              PolicyArn: 'arn:aws:iam::123456789012:policy/test-policy',
              PolicyName: 'test-policy',
            },
            {
              PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
              PolicyName: 'AmazonS3ReadOnlyAccess',
            },
          ],
        });

        const result = await getIamRolePolicyAttachedManaged(
          {
            by: {
              unique: {
                role: { name: 'test-role' },
                policy: { arn: 'arn:aws:iam::123456789012:policy/test-policy' },
              },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.role).toMatchObject({ name: 'test-role' });
        expect(result?.policy).toMatchObject({
          arn: 'arn:aws:iam::123456789012:policy/test-policy',
        });
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(ListAttachedRolePoliciesCommand),
        );
      });
    });
  });

  given('an aws-managed policy attachment', () => {
    when('fetched', () => {
      then('it should return the attachment', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'admin-role',
          arn: 'arn:aws:iam::123456789012:role/admin-role',
        });

        mockSend.mockResolvedValue({
          AttachedPolicies: [
            {
              PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
              PolicyName: 'AdministratorAccess',
            },
          ],
        });

        const result = await getIamRolePolicyAttachedManaged(
          {
            by: {
              unique: {
                role: { name: 'admin-role' },
                policy: { arn: 'arn:aws:iam::aws:policy/AdministratorAccess' },
              },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.policy.arn).toBe(
          'arn:aws:iam::aws:policy/AdministratorAccess',
        );
      });
    });
  });

  given('a policy attachment that does not exist', () => {
    when('fetched', () => {
      then('it should return null', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'test-role',
          arn: 'arn:aws:iam::123456789012:role/test-role',
        });

        mockSend.mockResolvedValue({
          AttachedPolicies: [
            {
              PolicyArn: 'arn:aws:iam::123456789012:policy/other-policy',
              PolicyName: 'other-policy',
            },
          ],
        });

        const result = await getIamRolePolicyAttachedManaged(
          {
            by: {
              unique: {
                role: { name: 'test-role' },
                policy: { arn: 'arn:aws:iam::123456789012:policy/nonexistent' },
              },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });

  given('a role that does not exist', () => {
    when('fetching an attachment', () => {
      then('it should return null', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue(
          null,
        );

        const result = await getIamRolePolicyAttachedManaged(
          {
            by: {
              unique: {
                role: { name: 'nonexistent-role' },
                policy: { arn: 'arn:aws:iam::123456789012:policy/test-policy' },
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

  given('a role with no attached policies', () => {
    when('fetching an attachment', () => {
      then('it should return null', async () => {
        (DeclaredAwsIamRoleDao.get.one.byRef as jest.Mock).mockResolvedValue({
          name: 'empty-role',
          arn: 'arn:aws:iam::123456789012:role/empty-role',
        });

        mockSend.mockResolvedValue({
          AttachedPolicies: [],
        });

        const result = await getIamRolePolicyAttachedManaged(
          {
            by: {
              unique: {
                role: { name: 'empty-role' },
                policy: { arn: 'arn:aws:iam::123456789012:policy/test-policy' },
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
