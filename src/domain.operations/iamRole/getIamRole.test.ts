import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import { getIamRole } from './getIamRole';

jest.mock('@aws-sdk/client-iam');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getSampleAwsApiContext();

describe('getIamRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a role that exists', () => {
    when('fetched by unique (name)', () => {
      then('it should return the role', async () => {
        mockSend.mockResolvedValue({
          Role: {
            RoleName: 'test-role',
            Arn: 'arn:aws:iam::123456789012:role/test-role',
            AssumeRolePolicyDocument: encodeURIComponent(
              JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Principal: { Service: 'lambda.amazonaws.com' },
                    Action: 'sts:AssumeRole',
                  },
                ],
              }),
            ),
          },
        });

        const result = await getIamRole(
          { by: { unique: { name: 'test-role' } } },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.name).toBe('test-role');
        expect(result?.arn).toBe('arn:aws:iam::123456789012:role/test-role');
        expect(mockSend).toHaveBeenCalledWith(expect.any(GetRoleCommand));
      });
    });

    when('fetched by primary (arn)', () => {
      then('it should extract role name from arn and fetch', async () => {
        mockSend.mockResolvedValue({
          Role: {
            RoleName: 'test-role',
            Arn: 'arn:aws:iam::123456789012:role/test-role',
            AssumeRolePolicyDocument: encodeURIComponent(
              JSON.stringify({ Version: '2012-10-17', Statement: [] }),
            ),
          },
        });

        const result = await getIamRole(
          {
            by: {
              primary: { arn: 'arn:aws:iam::123456789012:role/test-role' },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.name).toBe('test-role');
      });
    });
  });

  given('a role that does not exist', () => {
    when('fetched', () => {
      then('it should return null', async () => {
        const error = new Error('NoSuchEntityException');
        error.name = 'NoSuchEntityException';
        mockSend.mockRejectedValue(error);

        const result = await getIamRole(
          { by: { unique: { name: 'nonexistent-role' } } },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });

  given('a ref that is by unique', () => {
    when('fetched by ref', () => {
      then('it should route to unique lookup', async () => {
        mockSend.mockResolvedValue({
          Role: {
            RoleName: 'ref-role',
            Arn: 'arn:aws:iam::123456789012:role/ref-role',
            AssumeRolePolicyDocument: encodeURIComponent(
              JSON.stringify({ Version: '2012-10-17', Statement: [] }),
            ),
          },
        });

        const result = await getIamRole(
          { by: { ref: { name: 'ref-role' } } },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.name).toBe('ref-role');
      });
    });
  });
});
