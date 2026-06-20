import { DescribeRouteTablesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { given, then } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import { getOneVpcExid } from '@src/domain.operations/vpc/getOneVpcExid';
import { getOneVpcInternetGateway } from '@src/domain.operations/vpcInternetGateway/getOneVpcInternetGateway';
import { getOneVpcSubnet } from '@src/domain.operations/vpcSubnet/getOneVpcSubnet';

import * as castModule from './castIntoDeclaredAwsVpcRouteTable';
import { getOneVpcRouteTable } from './getOneVpcRouteTable';

jest.mock('@aws-sdk/client-ec2');
jest.mock('./castIntoDeclaredAwsVpcRouteTable');
jest.mock('@src/domain.operations/vpc/getOneVpcExid');
jest.mock('@src/domain.operations/vpcInternetGateway/getOneVpcInternetGateway');
jest.mock('@src/domain.operations/vpcSubnet/getOneVpcSubnet');

const mockSend = jest.fn();
(EC2Client as jest.Mock).mockImplementation(() => ({
  send: mockSend,
}));

const context = getMockedAwsApiContext();

describe('getOneVpcRouteTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // set up default mocks for vpc exid lookup
    (getOneVpcExid as jest.Mock).mockResolvedValue('test-vpc-exid');
    (getOneVpcInternetGateway as jest.Mock).mockResolvedValue({
      exid: 'test-igw-exid',
    });
    (getOneVpcSubnet as jest.Mock).mockResolvedValue({
      exid: 'test-subnet-exid',
    });
  });

  given('a route table ref by unique', () => {
    then(
      'we should call DescribeRouteTablesCommand with tag:exid filter',
      async () => {
        const rtResponse = {
          RouteTables: [
            {
              RouteTableId: 'rtb-123abc',
              VpcId: 'vpc-456def',
              Routes: [
                {
                  DestinationCidrBlock: '10.0.0.0/16',
                  GatewayId: 'local',
                  State: 'active',
                },
              ],
              Associations: [],
              Tags: [{ Key: 'exid', Value: 'my-test-rtb' }],
            },
          ],
        };

        mockSend.mockResolvedValue(rtResponse);

        (
          castModule.castIntoDeclaredAwsVpcRouteTable as jest.Mock
        ).mockReturnValue({
          id: 'rtb-123abc',
          exid: 'my-test-rtb',
          vpc: { id: 'vpc-456def' },
          routes: [],
          associations: [],
          tags: null,
        });

        const result = await getOneVpcRouteTable(
          { by: { unique: { exid: 'my-test-rtb' } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeRouteTablesCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.exid).toBe('my-test-rtb');
      },
    );
  });

  given('a route table ref by primary', () => {
    then(
      'we should call DescribeRouteTablesCommand with route-table-id filter',
      async () => {
        const rtId = 'rtb-456def';
        const rtResponse = {
          RouteTables: [
            {
              RouteTableId: rtId,
              VpcId: 'vpc-789ghi',
              Routes: [
                {
                  DestinationCidrBlock: '0.0.0.0/0',
                  GatewayId: 'igw-abc123',
                  State: 'active',
                },
              ],
              Associations: [
                {
                  RouteTableAssociationId: 'rtbassoc-123',
                  SubnetId: 'subnet-456',
                  RouteTableId: rtId,
                  Main: false,
                },
              ],
              Tags: [{ Key: 'exid', Value: 'test-rtb' }],
            },
          ],
        };

        mockSend.mockResolvedValue(rtResponse);

        (
          castModule.castIntoDeclaredAwsVpcRouteTable as jest.Mock
        ).mockReturnValue({
          id: rtId,
          exid: 'test-rtb',
          vpc: { id: 'vpc-789ghi' },
          routes: [
            {
              destination: { cidr: { v4: '0.0.0.0/0' } },
              target: { gatewayInternet: { exid: 'igw-abc123' } },
            },
          ],
          associations: [{ subnet: { id: 'subnet-456' } }],
          tags: null,
        });

        const result = await getOneVpcRouteTable(
          { by: { primary: { id: rtId } } },
          context,
        );

        expect(mockSend).toHaveBeenCalledWith(
          expect.any(DescribeRouteTablesCommand),
        );
        expect(result).not.toBeNull();
        expect(result?.id).toBe(rtId);
      },
    );
  });

  given('a route table ref by ref (generic)', () => {
    then('we should route unique refs to lookup', async () => {
      const rtResponse = {
        RouteTables: [
          {
            RouteTableId: 'rtb-789ghi',
            VpcId: 'vpc-abc123',
            Routes: [],
            Associations: [],
            Tags: [{ Key: 'exid', Value: 'generic-rtb' }],
          },
        ],
      };

      mockSend.mockResolvedValue(rtResponse);

      (
        castModule.castIntoDeclaredAwsVpcRouteTable as jest.Mock
      ).mockReturnValue({
        id: 'rtb-789ghi',
        exid: 'generic-rtb',
        vpc: { id: 'vpc-abc123' },
        routes: [],
        associations: [],
        tags: null,
      });

      // pass as a generic ref that looks like unique (has exid field)
      const result = await getOneVpcRouteTable(
        { by: { ref: { exid: 'generic-rtb' } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeRouteTablesCommand),
      );
      expect(result).not.toBeNull();
    });

    then('we should route primary refs to lookup', async () => {
      const rtId = 'rtb-abc123';
      const rtResponse = {
        RouteTables: [
          {
            RouteTableId: rtId,
            VpcId: 'vpc-def456',
            Routes: [],
            Associations: [],
            Tags: [{ Key: 'exid', Value: 'primary-rtb' }],
          },
        ],
      };

      mockSend.mockResolvedValue(rtResponse);

      (
        castModule.castIntoDeclaredAwsVpcRouteTable as jest.Mock
      ).mockReturnValue({
        id: rtId,
        exid: 'primary-rtb',
        vpc: { id: 'vpc-def456' },
        routes: [],
        associations: [],
        tags: null,
      });

      // pass as a generic ref that looks like primary (has id field)
      const result = await getOneVpcRouteTable(
        { by: { ref: { id: rtId } } },
        context,
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DescribeRouteTablesCommand),
      );
      expect(result).not.toBeNull();
    });
  });

  given('a route table that does not exist', () => {
    then('we should return null for empty RouteTables array', async () => {
      mockSend.mockResolvedValue({ RouteTables: [] });

      const result = await getOneVpcRouteTable(
        { by: { unique: { exid: 'nonexistent-rtb' } } },
        context,
      );

      expect(result).toBeNull();
    });

    then('we should return null for InvalidRouteTableID.NotFound', async () => {
      const error = new Error('Route table not found');
      error.name = 'InvalidRouteTableID.NotFound';
      mockSend.mockRejectedValue(error);

      const result = await getOneVpcRouteTable(
        { by: { primary: { id: 'rtb-nonexistent' } } },
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

      const result = await getOneVpcRouteTable(
        { by: { unique: { exid: 'nonexistent-rtb' } } },
        context,
      );

      expect(result).toBeNull();
    });
  });
});
