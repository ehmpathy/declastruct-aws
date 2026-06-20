import type { Vpc } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsVpc } from './castIntoDeclaredAwsVpc';

describe('castIntoDeclaredAwsVpc', () => {
  given('an AWS Vpc with all properties', () => {
    when('cast to domain object', () => {
      then('it should cast with all properties mapped', () => {
        const vpc: Vpc = {
          VpcId: 'vpc-1234567890abcdef0',
          CidrBlock: '10.0.0.0/16',
          Tags: [
            { Key: 'exid', Value: 'test-vpc' },
            { Key: 'managedBy', Value: 'declastruct' },
          ],
        };
        const vpcDns = { hostnames: true, support: true };
        const result = castIntoDeclaredAwsVpc({ vpc, vpcDns });
        expect(result).toMatchObject({
          id: 'vpc-1234567890abcdef0',
          exid: 'test-vpc',
          cidr: { v4: '10.0.0.0/16' },
          dns: { hostnames: 'enabled', support: 'enabled' },
          tags: { managedBy: 'declastruct' },
        });
      });
    });
  });

  given('an AWS Vpc without exid tag', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const vpc: Vpc = {
          VpcId: 'vpc-abc',
          CidrBlock: '10.0.0.0/16',
          Tags: [{ Key: 'Name', Value: 'some-name' }],
        };
        const vpcDns = { hostnames: true, support: true };
        const error = await getError(() =>
          castIntoDeclaredAwsVpc({ vpc, vpcDns }),
        );
        expect(error.message).toContain('vpc lacks exid tag');
      });
    });
  });

  given('an AWS Vpc without VpcId', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const vpc: Vpc = {
          CidrBlock: '10.0.0.0/16',
          Tags: [{ Key: 'exid', Value: 'test-vpc' }],
        };
        const vpcDns = { hostnames: true, support: true };
        const error = await getError(() =>
          castIntoDeclaredAwsVpc({ vpc, vpcDns }),
        );
        expect(error.message).toContain('vpc lacks id');
      });
    });
  });

  given('an AWS Vpc without CidrBlock', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const vpc: Vpc = {
          VpcId: 'vpc-abc',
          Tags: [{ Key: 'exid', Value: 'test-vpc' }],
        };
        const vpcDns = { hostnames: true, support: true };
        const error = await getError(() =>
          castIntoDeclaredAwsVpc({ vpc, vpcDns }),
        );
        expect(error.message).toContain('vpc lacks cidr block');
      });
    });
  });

  given('an AWS Vpc with DNS disabled', () => {
    when('cast to domain object', () => {
      then('it should cast with dns disabled', () => {
        const vpc: Vpc = {
          VpcId: 'vpc-nodns',
          CidrBlock: '10.0.0.0/16',
          Tags: [{ Key: 'exid', Value: 'no-dns-vpc' }],
        };
        const vpcDns = { hostnames: false, support: false };
        const result = castIntoDeclaredAwsVpc({ vpc, vpcDns });
        expect(result.dns).toEqual({
          hostnames: 'disabled',
          support: 'disabled',
        });
      });
    });
  });

  given('an AWS Vpc with only exid tag', () => {
    when('cast to domain object', () => {
      then('it should cast without tags property', () => {
        const vpc: Vpc = {
          VpcId: 'vpc-minimal',
          CidrBlock: '10.0.0.0/16',
          Tags: [{ Key: 'exid', Value: 'minimal-vpc' }],
        };
        const vpcDns = { hostnames: true, support: true };
        const result = castIntoDeclaredAwsVpc({ vpc, vpcDns });
        expect(result.tags).toBeNull();
      });
    });
  });
});
