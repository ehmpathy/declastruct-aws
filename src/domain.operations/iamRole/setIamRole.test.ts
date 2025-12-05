import {
  CreateRoleCommand,
  IAMClient,
  UpdateAssumeRolePolicyCommand,
  waitUntilRoleExists,
} from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import type { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
import * as getIamRoleModule from './getIamRole';
import { setIamRole } from './setIamRole';

jest.mock('@aws-sdk/client-iam');
jest.mock('./getIamRole');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));
(waitUntilRoleExists as jest.Mock).mockResolvedValue({});

const context = getSampleAwsApiContext();

const roleSample: DeclaredAwsIamRole = {
  name: 'test-execution-role',
  policies: [
    {
      effect: 'Allow',
      principal: { service: 'lambda.amazonaws.com' },
      action: 'sts:AssumeRole',
      resource: '*',
    },
  ],
};

describe('setIamRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a role that does not exist', () => {
    when('finsert is called', () => {
      then(
        'it should create the role and wait for it to be ready',
        async () => {
          (getIamRoleModule.getIamRole as jest.Mock)
            .mockResolvedValueOnce(null) // before check
            .mockResolvedValueOnce({
              ...roleSample,
              arn: 'arn:aws:iam::123456789012:role/test-execution-role',
            }); // after create

          mockSend.mockResolvedValue({});

          const result = await setIamRole({ finsert: roleSample }, context);

          expect(result.name).toBe('test-execution-role');
          expect(mockSend).toHaveBeenCalledWith(expect.any(CreateRoleCommand));
          expect(waitUntilRoleExists).toHaveBeenCalled();
        },
      );
    });
  });

  given('a role that already exists', () => {
    when('finsert is called', () => {
      then('it should return the existing role (idempotent)', async () => {
        const existingRole = {
          ...roleSample,
          arn: 'arn:aws:iam::123456789012:role/test-execution-role',
        };
        (getIamRoleModule.getIamRole as jest.Mock).mockResolvedValue(
          existingRole,
        );

        const result = await setIamRole({ finsert: roleSample }, context);

        expect(result).toBe(existingRole);
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    when('upsert is called', () => {
      then('it should update the trust policy', async () => {
        const existingRole = {
          ...roleSample,
          arn: 'arn:aws:iam::123456789012:role/test-execution-role',
        };
        (getIamRoleModule.getIamRole as jest.Mock)
          .mockResolvedValueOnce(existingRole) // before check
          .mockResolvedValueOnce(existingRole); // after update

        mockSend.mockResolvedValue({});

        const result = await setIamRole({ upsert: roleSample }, context);

        expect(result.name).toBe('test-execution-role');
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(UpdateAssumeRolePolicyCommand),
        );
      });
    });
  });
});
