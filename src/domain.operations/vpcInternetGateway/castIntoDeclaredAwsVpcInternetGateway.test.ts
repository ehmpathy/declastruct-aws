import type { InternetGateway } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsVpcInternetGateway } from './castIntoDeclaredAwsVpcInternetGateway';

describe('castIntoDeclaredAwsVpcInternetGateway', () => {
  given('an AWS InternetGateway with all properties', () => {
    when('cast to domain object', () => {
      then('it should cast with all properties mapped', () => {
        const awsIgw: InternetGateway = {
          InternetGatewayId: 'igw-1234567890abcdef0',
          Attachments: [
            { VpcId: 'vpc-abc123', State: 'available' as 'attached' },
          ],
          Tags: [
            { Key: 'exid', Value: 'test-igw' },
            { Key: 'managedBy', Value: 'declastruct' },
          ],
        };
        const result = castIntoDeclaredAwsVpcInternetGateway(
          awsIgw,
          'test-vpc-exid',
        );
        expect(result).toMatchObject({
          id: 'igw-1234567890abcdef0',
          exid: 'test-igw',
          vpc: { exid: 'test-vpc-exid' },
          tags: { managedBy: 'declastruct' },
        });
      });
    });
  });

  given('an AWS InternetGateway without exid tag', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsIgw: InternetGateway = {
          InternetGatewayId: 'igw-abc',
          Attachments: [
            { VpcId: 'vpc-abc123', State: 'available' as 'attached' },
          ],
          Tags: [{ Key: 'Name', Value: 'some-name' }],
        };
        const error = await getError(() =>
          castIntoDeclaredAwsVpcInternetGateway(awsIgw, 'test-vpc-exid'),
        );
        expect(error.message).toContain('internet gateway lacks exid tag');
      });
    });
  });

  given('an AWS InternetGateway not attached to a VPC', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsIgw: InternetGateway = {
          InternetGatewayId: 'igw-detached',
          Attachments: [],
          Tags: [{ Key: 'exid', Value: 'detached-igw' }],
        };
        const error = await getError(() =>
          castIntoDeclaredAwsVpcInternetGateway(awsIgw, 'test-vpc-exid'),
        );
        expect(error.message).toContain('internet gateway not attached');
      });
    });
  });

  given('an AWS InternetGateway with available state', () => {
    when('cast to domain object', () => {
      then('it should cast', () => {
        const awsIgw: InternetGateway = {
          InternetGatewayId: 'igw-attached',
          Attachments: [
            { VpcId: 'vpc-abc123', State: 'available' as 'attached' },
          ],
          Tags: [{ Key: 'exid', Value: 'attached-igw' }],
        };
        const result = castIntoDeclaredAwsVpcInternetGateway(
          awsIgw,
          'test-vpc-exid',
        );
        expect(result.vpc).toEqual({ exid: 'test-vpc-exid' });
      });
    });
  });

  given('an AWS InternetGateway with only exid tag', () => {
    when('cast to domain object', () => {
      then('it should cast without tags property', () => {
        const awsIgw: InternetGateway = {
          InternetGatewayId: 'igw-minimal',
          Attachments: [
            { VpcId: 'vpc-abc123', State: 'available' as 'attached' },
          ],
          Tags: [{ Key: 'exid', Value: 'minimal-igw' }],
        };
        const result = castIntoDeclaredAwsVpcInternetGateway(
          awsIgw,
          'test-vpc-exid',
        );
        expect(result.tags).toBeNull();
      });
    });
  });
});
