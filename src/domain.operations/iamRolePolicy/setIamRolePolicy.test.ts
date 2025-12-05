import { IAMClient, PutRolePolicyCommand } from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import type { DeclaredAwsIamRolePolicy } from '../../domain.objects/DeclaredAwsIamRolePolicy';
import * as getIamRolePolicyModule from './getIamRolePolicy';
import { setIamRolePolicy } from './setIamRolePolicy';

jest.mock('@aws-sdk/client-iam');
jest.mock('../../access/daos/DeclaredAwsIamRoleDao');
jest.mock('./getIamRolePolicy');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

const policySample: DeclaredAwsIamRolePolicy = {
  name: 'permissions',
  role: { name: 'test-role' },
  statements: [
    {
      effect: 'Allow',
      action: 's3:GetObject',
      resource: '*',
    },
  ],
};

describe('setIamRolePolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue({
      name: 'test-role',
      arn: 'arn:aws:iam::123456789012:role/test-role',
    });
  });

  given('a policy that does not exist', () => {
    when('finsert is called', () => {
      then('it should create the policy', async () => {
        (getIamRolePolicyModule.getIamRolePolicy as jest.Mock)
          .mockResolvedValueOnce(null) // before check
          .mockResolvedValueOnce(policySample); // after create

        mockSend.mockResolvedValue({});

        const result = await setIamRolePolicy(
          { finsert: policySample },
          context,
        );

        expect(result.name).toBe('permissions');
        expect(mockSend).toHaveBeenCalledWith(expect.any(PutRolePolicyCommand));
      });
    });
  });

  given('a policy that already exists', () => {
    when('finsert is called', () => {
      then('it should return the existing policy (idempotent)', async () => {
        (
          getIamRolePolicyModule.getIamRolePolicy as jest.Mock
        ).mockResolvedValue(policySample);

        const result = await setIamRolePolicy(
          { finsert: policySample },
          context,
        );

        expect(result).toBe(policySample);
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    when('upsert is called', () => {
      then('it should update the policy', async () => {
        (getIamRolePolicyModule.getIamRolePolicy as jest.Mock)
          .mockResolvedValueOnce(policySample) // before check
          .mockResolvedValueOnce(policySample); // after update

        mockSend.mockResolvedValue({});

        const result = await setIamRolePolicy(
          { upsert: policySample },
          context,
        );

        expect(result.name).toBe('permissions');
        expect(mockSend).toHaveBeenCalledWith(expect.any(PutRolePolicyCommand));
      });
    });
  });

  given('a role that does not exist', () => {
    when('set is called', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        (DeclaredAwsIamRoleDao.get.byRef as jest.Mock).mockResolvedValue(null);

        await expect(
          setIamRolePolicy({ finsert: policySample }, context),
        ).rejects.toThrow('role not found');
      });
    });
  });
});
