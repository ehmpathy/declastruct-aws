import {
  DescribeVpcAttributeCommand,
  DescribeVpcsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as castModule from './castIntoDeclaredAwsVpc';
import { getOneVpc } from './getOneVpc';

jest.mock('@aws-sdk/client-ec2');
jest.mock('./castIntoDeclaredAwsVpc');

const mockSend = jest.fn();
(EC2Client as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneVpc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('a VPC ref by unique', () => {
    then(
      'we should call DescribeVpcsCommand with tag:exid filter',
      async () => {
        const vpcResponse = {
          Vpcs: [
            {
              VpcId: 'vpc-123abc',
              CidrBlock: '10.0.0.0/16',
              Tags: [{ Key: 'exid', Value: 'my-test-vpc' }],
            },
          ],
        };
        const dnsHostnamesResponse = {
          EnableDnsHostnames: { Value: true },
        };
        const dnsSupportResponse = {
          EnableDnsSupport: { Value: true },
        };

        mockSend
          .mockResolvedValueOnce(vpcResponse)
          .mockResolvedValueOnce(dnsHostnamesResponse)
          .mockResolvedValueOnce(dnsSupportResponse);

        (castModule.castIntoDeclaredAwsVpc as jest.Mock).mockReturnValue({
          id: 'vpc-123abc',
          exid: 'my-test-vpc',
          cidr: { v4: '10.0.0.0/16' },
          dns: { hostnames: 'enabled', support: 'enabled' },
          tags: null,
        });

        const result = await getOneVpc(
          { by: { unique: { exid: 'my-test-vpc' } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeVpcsCommand));
        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeVpcAttributeCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.exid).toBe('my-test-vpc');
      },
    );
  });

  given('a VPC ref by primary', () => {
    then('we should call DescribeVpcsCommand with vpc-id filter', async () => {
      const vpcId = 'vpc-456def';
      const vpcResponse = {
        Vpcs: [
          {
            VpcId: vpcId,
            CidrBlock: '10.0.0.0/16',
            Tags: [{ Key: 'exid', Value: 'test-vpc' }],
          },
        ],
      };
      const dnsHostnamesResponse = {
        EnableDnsHostnames: { Value: true },
      };
      const dnsSupportResponse = {
        EnableDnsSupport: { Value: true },
      };

      mockSend
        .mockResolvedValueOnce(vpcResponse)
        .mockResolvedValueOnce(dnsHostnamesResponse)
        .mockResolvedValueOnce(dnsSupportResponse);

      (castModule.castIntoDeclaredAwsVpc as jest.Mock).mockReturnValue({
        id: vpcId,
        exid: 'test-vpc',
        cidr: { v4: '10.0.0.0/16' },
        dns: { hostnames: 'enabled', support: 'enabled' },
        tags: null,
      });

      const result = await getOneVpc(
        { by: { primary: { id: vpcId } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeVpcsCommand));
      expect(result).not.toBeNull();
      expect(result?.id).toBe(vpcId);
    });
  });

  given('a VPC ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const vpcResponse = {
        Vpcs: [
          {
            VpcId: 'vpc-789ghi',
            CidrBlock: '10.0.0.0/16',
            Tags: [{ Key: 'exid', Value: 'generic-vpc' }],
          },
        ],
      };
      const dnsHostnamesResponse = {
        EnableDnsHostnames: { Value: false },
      };
      const dnsSupportResponse = {
        EnableDnsSupport: { Value: true },
      };

      mockSend
        .mockResolvedValueOnce(vpcResponse)
        .mockResolvedValueOnce(dnsHostnamesResponse)
        .mockResolvedValueOnce(dnsSupportResponse);

      (castModule.castIntoDeclaredAwsVpc as jest.Mock).mockReturnValue({
        id: 'vpc-789ghi',
        exid: 'generic-vpc',
        cidr: { v4: '10.0.0.0/16' },
        dns: { hostnames: 'disabled', support: 'enabled' },
        tags: null,
      });

      // pass as a generic ref that looks like unique (has exid field)
      const result = await getOneVpc(
        { by: { ref: { exid: 'generic-vpc' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeVpcsCommand));
      expect(result).not.toBeNull();
    });

    then('we should route primary refs to lookup', async () => {
      const vpcId = 'vpc-abc123';
      const vpcResponse = {
        Vpcs: [
          {
            VpcId: vpcId,
            CidrBlock: '10.0.0.0/16',
            Tags: [{ Key: 'exid', Value: 'primary-vpc' }],
          },
        ],
      };
      const dnsHostnamesResponse = {
        EnableDnsHostnames: { Value: true },
      };
      const dnsSupportResponse = {
        EnableDnsSupport: { Value: true },
      };

      mockSend
        .mockResolvedValueOnce(vpcResponse)
        .mockResolvedValueOnce(dnsHostnamesResponse)
        .mockResolvedValueOnce(dnsSupportResponse);

      (castModule.castIntoDeclaredAwsVpc as jest.Mock).mockReturnValue({
        id: vpcId,
        exid: 'primary-vpc',
        cidr: { v4: '10.0.0.0/16' },
        dns: { hostnames: 'enabled', support: 'enabled' },
        tags: null,
      });

      // pass as a generic ref that looks like primary (has id field)
      const result = await getOneVpc({ by: { ref: { id: vpcId } } }, context);

      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeVpcsCommand));
      expect(result).not.toBeNull();
    });
  });

  given('a VPC that does not exist', () => {
    then('we should return null for empty Vpcs array', async () => {
      mockSend.mockResolvedValue({ Vpcs: [] });

      const result = await getOneVpc(
        { by: { unique: { exid: 'nonexistent-vpc' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for InvalidVpcID.NotFound', async () => {
      const error = new Error('VPC not found');
      error.name = 'InvalidVpcID.NotFound';
      mockSend.mockRejectedValue(error);

      const result = await getOneVpc(
        { by: { primary: { id: 'vpc-nonexistent' } } },
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

      const result = await getOneVpc(
        { by: { unique: { exid: 'nonexistent-vpc' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
