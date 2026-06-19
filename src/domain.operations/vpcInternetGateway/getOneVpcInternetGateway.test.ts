import {
  DescribeInternetGatewaysCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import * as castModule from './castIntoDeclaredAwsVpcInternetGateway';
import { getOneVpcInternetGateway } from './getOneVpcInternetGateway';

jest.mock('@aws-sdk/client-ec2');
jest.mock('./castIntoDeclaredAwsVpcInternetGateway');

const mockSend = jest.fn();
(EC2Client as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneVpcInternetGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('an internet gateway ref by unique', () => {
    then(
      'we should call DescribeInternetGatewaysCommand with tag:exid filter',
      async () => {
        const igwResponse = {
          InternetGateways: [
            {
              InternetGatewayId: 'igw-123abc',
              Attachments: [{ VpcId: 'vpc-456def', State: 'available' }],
              Tags: [{ Key: 'exid', Value: 'my-test-igw' }],
            },
          ],
        };

        mockSend.mockResolvedValue(igwResponse);

        (
          castModule.castIntoDeclaredAwsVpcInternetGateway as jest.Mock
        ).mockReturnValue({
          id: 'igw-123abc',
          exid: 'my-test-igw',
          vpc: { id: 'vpc-456def' },
          tags: null,
        });

        const result = await getOneVpcInternetGateway(
          { by: { unique: { exid: 'my-test-igw' } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeInternetGatewaysCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.exid).toBe('my-test-igw');
      },
    );
  });

  given('an internet gateway ref by primary', () => {
    then(
      'we should call DescribeInternetGatewaysCommand with internet-gateway-id filter',
      async () => {
        const igwId = 'igw-456def';
        const igwResponse = {
          InternetGateways: [
            {
              InternetGatewayId: igwId,
              Attachments: [{ VpcId: 'vpc-789ghi', State: 'available' }],
              Tags: [{ Key: 'exid', Value: 'test-igw' }],
            },
          ],
        };

        mockSend.mockResolvedValue(igwResponse);

        (
          castModule.castIntoDeclaredAwsVpcInternetGateway as jest.Mock
        ).mockReturnValue({
          id: igwId,
          exid: 'test-igw',
          vpc: { id: 'vpc-789ghi' },
          tags: null,
        });

        const result = await getOneVpcInternetGateway(
          { by: { primary: { id: igwId } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeInternetGatewaysCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.id).toBe(igwId);
      },
    );
  });

  given('an internet gateway ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const igwResponse = {
        InternetGateways: [
          {
            InternetGatewayId: 'igw-789ghi',
            Attachments: [{ VpcId: 'vpc-abc123', State: 'available' }],
            Tags: [{ Key: 'exid', Value: 'generic-igw' }],
          },
        ],
      };

      mockSend.mockResolvedValue(igwResponse);

      (
        castModule.castIntoDeclaredAwsVpcInternetGateway as jest.Mock
      ).mockReturnValue({
        id: 'igw-789ghi',
        exid: 'generic-igw',
        vpc: { id: 'vpc-abc123' },
        tags: null,
      });

      // pass as a generic ref that looks like unique (has exid field)
      const result = await getOneVpcInternetGateway(
        { by: { ref: { exid: 'generic-igw' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeInternetGatewaysCommand),
      );
      expect(result).not.toBeNull();
    });

    then('we should route primary refs to lookup', async () => {
      const igwId = 'igw-abc123';
      const igwResponse = {
        InternetGateways: [
          {
            InternetGatewayId: igwId,
            Attachments: [{ VpcId: 'vpc-def456', State: 'available' }],
            Tags: [{ Key: 'exid', Value: 'primary-igw' }],
          },
        ],
      };

      mockSend.mockResolvedValue(igwResponse);

      (
        castModule.castIntoDeclaredAwsVpcInternetGateway as jest.Mock
      ).mockReturnValue({
        id: igwId,
        exid: 'primary-igw',
        vpc: { id: 'vpc-def456' },
        tags: null,
      });

      // pass as a generic ref that looks like primary (has id field)
      const result = await getOneVpcInternetGateway(
        { by: { ref: { id: igwId } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeInternetGatewaysCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('an internet gateway that does not exist', () => {
    then('we should return null for empty InternetGateways array', async () => {
      mockSend.mockResolvedValue({ InternetGateways: [] });

      const result = await getOneVpcInternetGateway(
        { by: { unique: { exid: 'nonexistent-igw' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then(
      'we should return null for InvalidInternetGatewayID.NotFound',
      async () => {
        const error = new Error('Internet gateway not found');
        error.name = 'InvalidInternetGatewayID.NotFound';
        mockSend.mockRejectedValue(error);

        const result = await getOneVpcInternetGateway(
          { by: { primary: { id: 'igw-nonexistent' } } },
          context,
        );

        expect(result).toBeNull();
      },
    );

    then('we should return null for 404 status code', async () => {
      const error = new Error('Not found');
      error.name = 'Unknown';
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata = {
        httpStatusCode: 404,
      };
      mockSend.mockRejectedValue(error);

      const result = await getOneVpcInternetGateway(
        { by: { unique: { exid: 'nonexistent-igw' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
