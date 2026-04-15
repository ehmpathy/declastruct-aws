import { given, then, when } from 'test-fns';

import { DeclaredAwsVpcTunnel } from '@src/domain.objects/DeclaredAwsVpcTunnel';

import { castIntoDeclaredAwsVpcTunnel } from './castIntoDeclaredAwsVpcTunnel';

describe('castIntoDeclaredAwsVpcTunnel', () => {
  given('a unique ref with account and region', () => {
    when('cast into tunnel', () => {
      const result = castIntoDeclaredAwsVpcTunnel({
        unique: {
          account: '123456789012',
          region: 'us-east-1',
          via: {
            mechanism: 'aws.ssm',
            bastion: { exid: 'test-bastion' },
          },
          into: { cluster: { name: 'test-db' } },
          from: { host: 'localhost', port: 5432 },
        },
        status: 'OPEN',
        pid: 12345,
      });

      then('account is present in output', () => {
        expect(result.account).toBe('123456789012');
      });

      then('region is present in output', () => {
        expect(result.region).toBe('us-east-1');
      });

      then('output is a DeclaredAwsVpcTunnel instance', () => {
        expect(result).toBeInstanceOf(DeclaredAwsVpcTunnel);
      });

      then('all unique fields are present', () => {
        expect(result).toMatchObject({
          account: '123456789012',
          region: 'us-east-1',
          via: { mechanism: 'aws.ssm', bastion: { exid: 'test-bastion' } },
          into: { cluster: { name: 'test-db' } },
          from: { host: 'localhost', port: 5432 },
          status: 'OPEN',
          pid: 12345,
        });
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('a CLOSED tunnel with null pid', () => {
    when('cast into tunnel', () => {
      const result = castIntoDeclaredAwsVpcTunnel({
        unique: {
          account: '987654321098',
          region: 'eu-west-1',
          via: {
            mechanism: 'aws.ssm',
            bastion: { exid: 'eu-bastion' },
          },
          into: { cluster: { name: 'eu-db' } },
          from: { host: 'localhost', port: 15432 },
        },
        status: 'CLOSED',
        pid: null,
      });

      then('status is CLOSED and pid is null', () => {
        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('edge case: high port boundary', () => {
    when('cast with port 65535', () => {
      const result = castIntoDeclaredAwsVpcTunnel({
        unique: {
          account: '111222333444',
          region: 'ap-northeast-1',
          via: {
            mechanism: 'aws.ssm',
            bastion: { exid: 'tokyo-bastion' },
          },
          into: { cluster: { name: 'tokyo-db' } },
          from: { host: 'localhost', port: 65535 },
        },
        status: 'OPEN',
        pid: 55555,
      });

      then('port is at boundary', () => {
        expect(result.from.port).toBe(65535);
        expect(result).toMatchSnapshot();
      });
    });
  });
});
