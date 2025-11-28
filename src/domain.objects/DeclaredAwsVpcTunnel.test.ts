import { given, then, when } from 'test-fns';

import { DeclaredAwsVpcTunnel } from './DeclaredAwsVpcTunnel';

describe('DeclaredAwsVpcTunnel', () => {
  given('valid via, into, from, and status', () => {
    when('instantiated', () => {
      let tunnel: DeclaredAwsVpcTunnel;

      then('it should instantiate', () => {
        tunnel = new DeclaredAwsVpcTunnel({
          via: { mechanism: 'aws.ssm', bastion: { exid: 'test-bastion' } },
          into: { cluster: { name: 'test-db' } },
          from: { host: 'localhost', port: 5432 },
          status: 'CLOSED',
        });
      });

      then('it should have all required properties', () => {
        expect(tunnel).toMatchObject({
          via: { mechanism: 'aws.ssm', bastion: { exid: 'test-bastion' } },
          into: { cluster: { name: 'test-db' } },
          from: { host: 'localhost', port: 5432 },
          status: 'CLOSED',
        });
      });

      then('readonly pid is undefined by default', () => {
        expect(tunnel.pid).toBeUndefined();
      });
    });
  });

  given('all properties provided including pid', () => {
    when('instantiated with readonly attributes', () => {
      let tunnel: DeclaredAwsVpcTunnel;

      then('it should instantiate', () => {
        tunnel = new DeclaredAwsVpcTunnel({
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
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as via, into, from', () => {
      expect(DeclaredAwsVpcTunnel.unique).toEqual(['via', 'into', 'from']);
    });

    then('readonly is defined as status, pid', () => {
      expect(DeclaredAwsVpcTunnel.readonly).toEqual(['status', 'pid']);
    });
  });
});
