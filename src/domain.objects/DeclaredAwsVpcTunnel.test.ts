import { given, then, when } from 'test-fns';

import { DeclaredAwsVpcTunnel } from './DeclaredAwsVpcTunnel';

describe('DeclaredAwsVpcTunnel', () => {
  given('valid account, region, via, into, from, and status', () => {
    when('instantiated', () => {
      let tunnel: DeclaredAwsVpcTunnel;

      then('it should instantiate', () => {
        tunnel = new DeclaredAwsVpcTunnel({
          account: '123456789012',
          region: 'us-east-1',
          via: { mechanism: 'aws.ssm', bastion: { exid: 'test-bastion' } },
          into: { cluster: { name: 'test-db' } },
          from: { host: 'localhost', port: 5432 },
          status: 'CLOSED',
        });
      });

      then('it should have all required properties', () => {
        expect(tunnel).toMatchObject({
          account: '123456789012',
          region: 'us-east-1',
          via: { mechanism: 'aws.ssm', bastion: { exid: 'test-bastion' } },
          into: { cluster: { name: 'test-db' } },
          from: { host: 'localhost', port: 5432 },
          status: 'CLOSED',
        });
        expect(tunnel).toMatchSnapshot();
      });

      then('readonly pid is undefined by default', () => {
        expect(tunnel.pid).toBeUndefined();
      });
    });
  });

  given('all properties provided with pid', () => {
    when('instantiated with readonly attributes', () => {
      let tunnel: DeclaredAwsVpcTunnel;

      then('it should instantiate', () => {
        tunnel = new DeclaredAwsVpcTunnel({
          account: '123456789012',
          region: 'us-east-1',
          via: { mechanism: 'aws.ssm', bastion: { exid: 'test-bastion' } },
          into: { cluster: { name: 'test-db' } },
          from: { host: 'localhost', port: 7775432 },
          status: 'OPEN',
          pid: 12345,
        });
      });

      then('it should have readonly status and pid', () => {
        expect(tunnel).toMatchObject({
          status: 'OPEN',
          pid: 12345,
        });
        expect(tunnel).toMatchSnapshot();
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as account, region, via, into, from', () => {
      expect(DeclaredAwsVpcTunnel.unique).toEqual([
        'account',
        'region',
        'via',
        'into',
        'from',
      ]);
    });

    then('readonly is defined as pid', () => {
      expect(DeclaredAwsVpcTunnel.readonly).toEqual(['pid']);
    });
  });

  given('edge case: different aws region', () => {
    when('instantiated with eu-west-1', () => {
      const tunnel = new DeclaredAwsVpcTunnel({
        account: '987654321098',
        region: 'eu-west-1',
        via: { mechanism: 'aws.ssm', bastion: { exid: 'eu-bastion' } },
        into: { cluster: { name: 'eu-db' } },
        from: { host: 'localhost', port: 15432 },
        status: 'CLOSED',
      });

      then('region is eu-west-1', () => {
        expect(tunnel.region).toBe('eu-west-1');
        expect(tunnel).toMatchSnapshot();
      });
    });
  });

  given('edge case: high port number', () => {
    when('instantiated with port 65535', () => {
      const tunnel = new DeclaredAwsVpcTunnel({
        account: '123456789012',
        region: 'us-west-2',
        via: { mechanism: 'aws.ssm', bastion: { exid: 'highport-bastion' } },
        into: { cluster: { name: 'highport-db' } },
        from: { host: 'localhost', port: 65535 },
        status: 'OPEN',
        pid: 99999,
      });

      then('port is at boundary', () => {
        expect(tunnel.from.port).toBe(65535);
        expect(tunnel).toMatchSnapshot();
      });
    });
  });

  given('edge case: pid is null for CLOSED status', () => {
    when('instantiated with explicit null pid', () => {
      const tunnel = new DeclaredAwsVpcTunnel({
        account: '123456789012',
        region: 'ap-southeast-1',
        via: { mechanism: 'aws.ssm', bastion: { exid: 'asia-bastion' } },
        into: { cluster: { name: 'asia-db' } },
        from: { host: 'localhost', port: 5433 },
        status: 'CLOSED',
        pid: null,
      });

      then('pid is null', () => {
        expect(tunnel.pid).toBeNull();
        expect(tunnel).toMatchSnapshot();
      });
    });
  });
});
