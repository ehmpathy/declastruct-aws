import {
  CreatePolicyCommand,
  OrganizationsClient,
  TagResourceCommand,
  UntagResourceCommand,
  UpdatePolicyCommand,
} from '@aws-sdk/client-organizations';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import { DeclaredAwsIamPolicyDocument } from '@src/domain.objects/DeclaredAwsIamPolicyDocument';
import { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';

import * as castModule from './castIntoDeclaredAwsOrganizationServiceControlPolicy';
import * as getOneModule from './getOneOrganizationServiceControlPolicy';
import { setOrganizationServiceControlPolicy } from './setOrganizationServiceControlPolicy';

jest.mock('@aws-sdk/client-organizations');
jest.mock('./castIntoDeclaredAwsOrganizationServiceControlPolicy');
jest.mock('./getOneOrganizationServiceControlPolicy');

const mockSend = jest.fn();
(OrganizationsClient as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

const sampleDesiredPolicy = {
  name: 'deny-dangerous-actions',
  description: 'blocks exfiltration vectors',
  content: new DeclaredAwsIamPolicyDocument({
    statements: [
      new DeclaredAwsIamPolicyStatement({
        sid: 'DenySnapshotShare',
        effect: 'Deny',
        action: ['rds:ModifyDBSnapshotAttribute'],
        resource: '*',
      }),
    ],
  }),
  tags: { managedBy: 'declastruct' },
};

const sampleAwsPolicy = {
  PolicySummary: {
    Id: 'p-abc123',
    Arn: 'arn:aws:organizations::123456789012:policy/o-org123/service_control_policy/p-abc123',
    Name: 'deny-dangerous-actions',
    Description: 'blocks exfiltration vectors',
    Type: 'SERVICE_CONTROL_POLICY',
  },
  Content: JSON.stringify({
    Version: '2012-10-17',
    Statement: [{ Effect: 'Deny', Action: '*', Resource: '*' }],
  }),
};

const sampleCastedPolicy = {
  id: 'p-abc123',
  arn: 'arn:aws:organizations::123456789012:policy/o-org123/service_control_policy/p-abc123',
  name: 'deny-dangerous-actions',
  description: 'blocks exfiltration vectors',
  content: {
    statements: [{ effect: 'Deny', action: '*', resource: '*' }],
  },
  tags: { managedBy: 'declastruct' },
};

describe('setOrganizationServiceControlPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  given('a policy already exists', () => {
    then('findsert should return foundBefore without update', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(sampleCastedPolicy);

      const result = await setOrganizationServiceControlPolicy(
        { findsert: sampleDesiredPolicy },
        context,
      );

      expect(mockSend).not.toHaveBeenCalledWith(
        expect.any(CreatePolicyCommand),
      );
      expect(mockSend).not.toHaveBeenCalledWith(
        expect.any(UpdatePolicyCommand),
      );
      expect(result).toEqual(sampleCastedPolicy);
    });

    then('upsert should update the policy', async () => {
      (getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock)
        .mockResolvedValueOnce(sampleCastedPolicy)
        .mockResolvedValueOnce(sampleCastedPolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof UpdatePolicyCommand) {
          return Promise.resolve({ Policy: sampleAwsPolicy });
        }
        if (
          command instanceof TagResourceCommand ||
          command instanceof UntagResourceCommand
        ) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      const result = await setOrganizationServiceControlPolicy(
        { upsert: sampleDesiredPolicy },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(UpdatePolicyCommand));
      expect(result?.id).toBe('p-abc123');
    });
  });

  given('a policy does not exist', () => {
    then('findsert should create a new policy', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(null);

      mockSend.mockImplementation((command) => {
        if (command instanceof CreatePolicyCommand) {
          return Promise.resolve({ Policy: sampleAwsPolicy });
        }
        return Promise.resolve({});
      });

      (
        castModule.castIntoDeclaredAwsOrganizationServiceControlPolicy as jest.Mock
      ).mockReturnValue(sampleCastedPolicy);

      const result = await setOrganizationServiceControlPolicy(
        { findsert: sampleDesiredPolicy },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(CreatePolicyCommand));
      expect(result?.id).toBe('p-abc123');
    });

    then('upsert should create a new policy', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(null);

      mockSend.mockImplementation((command) => {
        if (command instanceof CreatePolicyCommand) {
          return Promise.resolve({ Policy: sampleAwsPolicy });
        }
        return Promise.resolve({});
      });

      (
        castModule.castIntoDeclaredAwsOrganizationServiceControlPolicy as jest.Mock
      ).mockReturnValue(sampleCastedPolicy);

      const result = await setOrganizationServiceControlPolicy(
        { upsert: sampleDesiredPolicy },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(CreatePolicyCommand));
      expect(result?.id).toBe('p-abc123');
    });
  });

  given('DuplicatePolicyException is thrown', () => {
    then('findsert should return foundAfter (idempotent)', async () => {
      (getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(sampleCastedPolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof CreatePolicyCommand) {
          const error = new Error('Duplicate policy');
          error.name = 'DuplicatePolicyException';
          return Promise.reject(error);
        }
        return Promise.resolve({});
      });

      const result = await setOrganizationServiceControlPolicy(
        { findsert: sampleDesiredPolicy },
        context,
      );

      expect(result).toEqual(sampleCastedPolicy);
    });

    then('upsert should update foundAfter', async () => {
      (getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(sampleCastedPolicy)
        .mockResolvedValueOnce(sampleCastedPolicy);

      mockSend.mockImplementation((command) => {
        if (command instanceof CreatePolicyCommand) {
          const error = new Error('Duplicate policy');
          error.name = 'DuplicatePolicyException';
          return Promise.reject(error);
        }
        if (command instanceof UpdatePolicyCommand) {
          return Promise.resolve({ Policy: sampleAwsPolicy });
        }
        if (
          command instanceof TagResourceCommand ||
          command instanceof UntagResourceCommand
        ) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      const result = await setOrganizationServiceControlPolicy(
        { upsert: sampleDesiredPolicy },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(UpdatePolicyCommand));
      expect(result?.id).toBe('p-abc123');
    });
  });

  given('content exceeds 5KB limit', () => {
    then('we should throw a BadRequestError', async () => {
      const largeContent = new DeclaredAwsIamPolicyDocument({
        statements: [
          new DeclaredAwsIamPolicyStatement({
            sid: 'LargeStatement',
            effect: 'Deny',
            action: new Array(1000).fill('s3:GetObject'),
            resource: '*',
          }),
        ],
      });

      const largePolicy = {
        ...sampleDesiredPolicy,
        content: largeContent,
      };

      await expect(
        setOrganizationServiceControlPolicy({ findsert: largePolicy }, context),
      ).rejects.toThrow('policy content exceeds 5KB limit');
    });
  });

  given('CreatePolicy returns no policy', () => {
    then('we should throw a HelpfulError', async () => {
      (
        getOneModule.getOneOrganizationServiceControlPolicy as jest.Mock
      ).mockResolvedValue(null);

      mockSend.mockImplementation((command) => {
        if (command instanceof CreatePolicyCommand) {
          return Promise.resolve({ Policy: undefined });
        }
        return Promise.resolve({});
      });

      await expect(
        setOrganizationServiceControlPolicy(
          { findsert: sampleDesiredPolicy },
          context,
        ),
      ).rejects.toThrow('CreatePolicy did not return policy');
    });
  });
});
