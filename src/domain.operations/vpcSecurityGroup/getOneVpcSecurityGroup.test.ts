import { DescribeSecurityGroupsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as castModule from './castIntoDeclaredAwsVpcSecurityGroup';
import { getOneVpcSecurityGroup } from './getOneVpcSecurityGroup';

jest.mock('@aws-sdk/client-ec2');
jest.mock('./castIntoDeclaredAwsVpcSecurityGroup');

const mockSend = jest.fn();
(EC2Client as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneVpcSecurityGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a security group ref by unique', () => {
    then(
      'we should call DescribeSecurityGroupsCommand with tag:exid filter',
      async () => {
        const sgResponse = {
          SecurityGroups: [
            {
              GroupId: 'sg-123abc',
              GroupName: 'test-sg',
              VpcId: 'vpc-456def',
              Description: 'Test security group',
              IpPermissions: [],
              IpPermissionsEgress: [],
              Tags: [{ Key: 'exid', Value: 'my-test-sg' }],
            },
          ],
        };

        mockSend.mockResolvedValue(sgResponse);

        (
          castModule.castIntoDeclaredAwsVpcSecurityGroup as jest.Mock
        ).mockReturnValue({
          id: 'sg-123abc',
          exid: 'my-test-sg',
          vpc: { id: 'vpc-456def' },
          name: 'test-sg',
          description: 'Test security group',
          rules: { ingress: [], egress: [] },
          tags: null,
        });

        const result = await getOneVpcSecurityGroup(
          { by: { unique: { exid: 'my-test-sg' } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeSecurityGroupsCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.exid).toBe('my-test-sg');
      },
    );
  });

  given('a security group ref by primary', () => {
    then(
      'we should call DescribeSecurityGroupsCommand with group-id filter',
      async () => {
        const sgId = 'sg-456def';
        const sgResponse = {
          SecurityGroups: [
            {
              GroupId: sgId,
              GroupName: 'primary-sg',
              VpcId: 'vpc-789ghi',
              Description: 'Primary security group',
              IpPermissions: [],
              IpPermissionsEgress: [],
              Tags: [{ Key: 'exid', Value: 'test-sg' }],
            },
          ],
        };

        mockSend.mockResolvedValue(sgResponse);

        (
          castModule.castIntoDeclaredAwsVpcSecurityGroup as jest.Mock
        ).mockReturnValue({
          id: sgId,
          exid: 'test-sg',
          vpc: { id: 'vpc-789ghi' },
          name: 'primary-sg',
          description: 'Primary security group',
          rules: { ingress: [], egress: [] },
          tags: null,
        });

        const result = await getOneVpcSecurityGroup(
          { by: { primary: { id: sgId } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeSecurityGroupsCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.id).toBe(sgId);
      },
    );
  });

  given('a security group ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const sgResponse = {
        SecurityGroups: [
          {
            GroupId: 'sg-789ghi',
            GroupName: 'generic-sg',
            VpcId: 'vpc-abc123',
            Description: 'Generic security group',
            IpPermissions: [],
            IpPermissionsEgress: [],
            Tags: [{ Key: 'exid', Value: 'generic-sg' }],
          },
        ],
      };

      mockSend.mockResolvedValue(sgResponse);

      (
        castModule.castIntoDeclaredAwsVpcSecurityGroup as jest.Mock
      ).mockReturnValue({
        id: 'sg-789ghi',
        exid: 'generic-sg',
        vpc: { id: 'vpc-abc123' },
        name: 'generic-sg',
        description: 'Generic security group',
        rules: { ingress: [], egress: [] },
        tags: null,
      });

      // pass as a generic ref that looks like unique (has exid field)
      const result = await getOneVpcSecurityGroup(
        { by: { ref: { exid: 'generic-sg' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeSecurityGroupsCommand),
      );
      expect(result).not.toBeNull();
    });

    then('we should route primary refs to lookup', async () => {
      const sgId = 'sg-abc123';
      const sgResponse = {
        SecurityGroups: [
          {
            GroupId: sgId,
            GroupName: 'primary-sg',
            VpcId: 'vpc-def456',
            Description: 'Primary ref security group',
            IpPermissions: [],
            IpPermissionsEgress: [],
            Tags: [{ Key: 'exid', Value: 'primary-sg' }],
          },
        ],
      };

      mockSend.mockResolvedValue(sgResponse);

      (
        castModule.castIntoDeclaredAwsVpcSecurityGroup as jest.Mock
      ).mockReturnValue({
        id: sgId,
        exid: 'primary-sg',
        vpc: { id: 'vpc-def456' },
        name: 'primary-sg',
        description: 'Primary ref security group',
        rules: { ingress: [], egress: [] },
        tags: null,
      });

      // pass as a generic ref that looks like primary (has id field)
      const result = await getOneVpcSecurityGroup(
        { by: { ref: { id: sgId } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeSecurityGroupsCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('a security group that does not exist', () => {
    then('we should return null for empty SecurityGroups array', async () => {
      mockSend.mockResolvedValue({ SecurityGroups: [] });

      const result = await getOneVpcSecurityGroup(
        { by: { unique: { exid: 'nonexistent-sg' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for InvalidGroup.NotFound', async () => {
      const error = new Error('Security group not found');
      error.name = 'InvalidGroup.NotFound';
      mockSend.mockRejectedValue(error);

      const result = await getOneVpcSecurityGroup(
        { by: { primary: { id: 'sg-nonexistent' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for 404 status code', async () => {
      const error = new Error('Not found');
      error.name = 'Unknown';
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata = {
        httpStatusCode: 404,
      };
      mockSend.mockRejectedValue(error);

      const result = await getOneVpcSecurityGroup(
        { by: { unique: { exid: 'nonexistent-sg' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
