import {
  GetPolicyCommand,
  GetPolicyVersionCommand,
  IAMClient,
  ListPolicyTagsCommand,
} from '@aws-sdk/client-iam';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getOneIamPolicy } from './getOneIamPolicy';

jest.mock('@aws-sdk/client-iam');

const mockSend = jest.fn();
(IAMClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneIamPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a policy that exists', () => {
    when('fetched by primary (arn)', () => {
      then('it should return the policy', async () => {
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof GetPolicyCommand) {
            return {
              Policy: {
                Arn: 'arn:aws:iam::123456789012:policy/test-policy',
                PolicyName: 'test-policy',
                Path: '/',
                DefaultVersionId: 'v1',
              },
            };
          }
          if (command instanceof GetPolicyVersionCommand) {
            return {
              PolicyVersion: {
                Document: encodeURIComponent(
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
              },
            };
          }
          if (command instanceof ListPolicyTagsCommand) {
            return { Tags: [] };
          }
          return {};
        });

        const result = await getOneIamPolicy(
          {
            by: {
              primary: { arn: 'arn:aws:iam::123456789012:policy/test-policy' },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.arn).toBe(
          'arn:aws:iam::123456789012:policy/test-policy',
        );
        expect(result?.name).toBe('test-policy');
        expect(result?.document.statements).toHaveLength(1);
      });
    });

    when('fetched by unique (name and path)', () => {
      then('it should return the policy', async () => {
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof GetPolicyCommand) {
            return {
              Policy: {
                Arn: 'arn:aws:iam::123456789012:policy/unique-policy',
                PolicyName: 'unique-policy',
                Path: '/',
                DefaultVersionId: 'v1',
              },
            };
          }
          if (command instanceof GetPolicyVersionCommand) {
            return {
              PolicyVersion: {
                Document: encodeURIComponent(
                  JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [
                      { Effect: 'Allow', Action: '*', Resource: '*' },
                    ],
                  }),
                ),
              },
            };
          }
          if (command instanceof ListPolicyTagsCommand) {
            return { Tags: [] };
          }
          return {};
        });

        const result = await getOneIamPolicy(
          {
            by: {
              unique: { name: 'unique-policy', path: '/' },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.name).toBe('unique-policy');
      });
    });

    when('fetched by ref (primary)', () => {
      then('it should return the policy', async () => {
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof GetPolicyCommand) {
            return {
              Policy: {
                Arn: 'arn:aws:iam::123456789012:policy/ref-policy',
                PolicyName: 'ref-policy',
                Path: '/',
                DefaultVersionId: 'v1',
              },
            };
          }
          if (command instanceof GetPolicyVersionCommand) {
            return {
              PolicyVersion: {
                Document: encodeURIComponent(
                  JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [
                      { Effect: 'Allow', Action: '*', Resource: '*' },
                    ],
                  }),
                ),
              },
            };
          }
          if (command instanceof ListPolicyTagsCommand) {
            return { Tags: [] };
          }
          return {};
        });

        const result = await getOneIamPolicy(
          {
            by: {
              ref: { arn: 'arn:aws:iam::123456789012:policy/ref-policy' },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.arn).toBe('arn:aws:iam::123456789012:policy/ref-policy');
      });
    });
  });

  given('a policy that does not exist', () => {
    when('fetched', () => {
      then('it should return null', async () => {
        const error = new Error('NoSuchEntityException');
        error.name = 'NoSuchEntityException';
        mockSend.mockRejectedValue(error);

        const result = await getOneIamPolicy(
          {
            by: {
              primary: { arn: 'arn:aws:iam::123456789012:policy/nonexistent' },
            },
          },
          context,
        );

        expect(result).toBeNull();
      });
    });
  });

  given('an aws-managed policy', () => {
    when('fetched', () => {
      then('it should return the policy without fetching tags', async () => {
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof GetPolicyCommand) {
            return {
              Policy: {
                Arn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
                PolicyName: 'AmazonS3ReadOnlyAccess',
                Path: '/',
                DefaultVersionId: 'v3',
              },
            };
          }
          if (command instanceof GetPolicyVersionCommand) {
            return {
              PolicyVersion: {
                Document: encodeURIComponent(
                  JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [
                      {
                        Effect: 'Allow',
                        Action: ['s3:Get*', 's3:List*'],
                        Resource: '*',
                      },
                    ],
                  }),
                ),
              },
            };
          }
          // ListPolicyTagsCommand should not be called for aws-managed policies
          if (command instanceof ListPolicyTagsCommand) {
            throw new Error('Should not fetch tags for aws-managed policies');
          }
          return {};
        });

        const result = await getOneIamPolicy(
          {
            by: {
              primary: {
                arn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
              },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.arn).toBe(
          'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
        );
        expect(result?.tags).toBeUndefined();
      });
    });
  });

  given('a policy with tags', () => {
    when('fetched', () => {
      then('it should return the policy with tags', async () => {
        mockSend.mockImplementation((command: unknown) => {
          if (command instanceof GetPolicyCommand) {
            return {
              Policy: {
                Arn: 'arn:aws:iam::123456789012:policy/tagged-policy',
                PolicyName: 'tagged-policy',
                Path: '/',
                DefaultVersionId: 'v1',
              },
            };
          }
          if (command instanceof GetPolicyVersionCommand) {
            return {
              PolicyVersion: {
                Document: encodeURIComponent(
                  JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [
                      { Effect: 'Allow', Action: '*', Resource: '*' },
                    ],
                  }),
                ),
              },
            };
          }
          if (command instanceof ListPolicyTagsCommand) {
            return {
              Tags: [
                { Key: 'environment', Value: 'production' },
                { Key: 'team', Value: 'platform' },
              ],
            };
          }
          return {};
        });

        const result = await getOneIamPolicy(
          {
            by: {
              primary: {
                arn: 'arn:aws:iam::123456789012:policy/tagged-policy',
              },
            },
          },
          context,
        );

        expect(result).not.toBeNull();
        expect(result?.tags).toEqual({
          environment: 'production',
          team: 'platform',
        });
      });
    });
  });
});
