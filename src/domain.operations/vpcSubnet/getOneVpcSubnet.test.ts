import { DescribeSubnetsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as castModule from './castIntoDeclaredAwsVpcSubnet';
import { getOneVpcSubnet } from './getOneVpcSubnet';

jest.mock('@aws-sdk/client-ec2');
jest.mock('./castIntoDeclaredAwsVpcSubnet');

const mockSend = jest.fn();
(EC2Client as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneVpcSubnet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a subnet ref by unique', () => {
    then(
      'we should call DescribeSubnetsCommand with tag:exid filter',
      async () => {
        const subnetResponse = {
          Subnets: [
            {
              SubnetId: 'subnet-123abc',
              VpcId: 'vpc-456def',
              CidrBlock: '10.0.1.0/24',
              AvailabilityZone: 'us-east-1a',
              Tags: [{ Key: 'exid', Value: 'my-test-subnet' }],
            },
          ],
        };

        mockSend.mockResolvedValue(subnetResponse);

        (castModule.castIntoDeclaredAwsVpcSubnet as jest.Mock).mockReturnValue({
          id: 'subnet-123abc',
          exid: 'my-test-subnet',
          vpc: { id: 'vpc-456def' },
          cidr: { v4: '10.0.1.0/24' },
          zone: { availability: 'us-east-1a' },
          tags: null,
        });

        const result = await getOneVpcSubnet(
          { by: { unique: { exid: 'my-test-subnet' } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeSubnetsCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.exid).toBe('my-test-subnet');
      },
    );
  });

  given('a subnet ref by primary', () => {
    then(
      'we should call DescribeSubnetsCommand with subnet-id filter',
      async () => {
        const subnetId = 'subnet-456def';
        const subnetResponse = {
          Subnets: [
            {
              SubnetId: subnetId,
              VpcId: 'vpc-789ghi',
              CidrBlock: '10.0.2.0/24',
              AvailabilityZone: 'us-east-1b',
              Tags: [{ Key: 'exid', Value: 'test-subnet' }],
            },
          ],
        };

        mockSend.mockResolvedValue(subnetResponse);

        (castModule.castIntoDeclaredAwsVpcSubnet as jest.Mock).mockReturnValue({
          id: subnetId,
          exid: 'test-subnet',
          vpc: { id: 'vpc-789ghi' },
          cidr: { v4: '10.0.2.0/24' },
          zone: { availability: 'us-east-1b' },
          tags: null,
        });

        const result = await getOneVpcSubnet(
          { by: { primary: { id: subnetId } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeSubnetsCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.id).toBe(subnetId);
      },
    );
  });

  given('a subnet ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const subnetResponse = {
        Subnets: [
          {
            SubnetId: 'subnet-789ghi',
            VpcId: 'vpc-abc123',
            CidrBlock: '10.0.3.0/24',
            AvailabilityZone: 'us-east-1c',
            Tags: [{ Key: 'exid', Value: 'generic-subnet' }],
          },
        ],
      };

      mockSend.mockResolvedValue(subnetResponse);

      (castModule.castIntoDeclaredAwsVpcSubnet as jest.Mock).mockReturnValue({
        id: 'subnet-789ghi',
        exid: 'generic-subnet',
        vpc: { id: 'vpc-abc123' },
        cidr: { v4: '10.0.3.0/24' },
        zone: { availability: 'us-east-1c' },
        tags: null,
      });

      // pass as a generic ref that looks like unique (has exid field)
      const result = await getOneVpcSubnet(
        { by: { ref: { exid: 'generic-subnet' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeSubnetsCommand));
      expect(result).not.toBeNull();
    });

    then('we should route primary refs to lookup', async () => {
      const subnetId = 'subnet-abc123';
      const subnetResponse = {
        Subnets: [
          {
            SubnetId: subnetId,
            VpcId: 'vpc-def456',
            CidrBlock: '10.0.4.0/24',
            AvailabilityZone: 'us-east-1a',
            Tags: [{ Key: 'exid', Value: 'primary-subnet' }],
          },
        ],
      };

      mockSend.mockResolvedValue(subnetResponse);

      (castModule.castIntoDeclaredAwsVpcSubnet as jest.Mock).mockReturnValue({
        id: subnetId,
        exid: 'primary-subnet',
        vpc: { id: 'vpc-def456' },
        cidr: { v4: '10.0.4.0/24' },
        zone: { availability: 'us-east-1a' },
        tags: null,
      });

      // pass as a generic ref that looks like primary (has id field)
      const result = await getOneVpcSubnet(
        { by: { ref: { id: subnetId } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeSubnetsCommand));
      expect(result).not.toBeNull();
    });
  });

  given('a subnet that does not exist', () => {
    then('we should return null for empty Subnets array', async () => {
      mockSend.mockResolvedValue({ Subnets: [] });

      const result = await getOneVpcSubnet(
        { by: { unique: { exid: 'nonexistent-subnet' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for InvalidSubnetID.NotFound', async () => {
      const error = new Error('Subnet not found');
      error.name = 'InvalidSubnetID.NotFound';
      mockSend.mockRejectedValue(error);

      const result = await getOneVpcSubnet(
        { by: { primary: { id: 'subnet-nonexistent' } } },
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

      const result = await getOneVpcSubnet(
        { by: { unique: { exid: 'nonexistent-subnet' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
