import { given, then, when } from 'test-fns';

import { getTunnelHash } from './getTunnelHash';

describe('getTunnelHash', () => {
  given('a tunnel reference', () => {
    when('hashed twice', () => {
      let hash1: string;
      let hash2: string;

      const tunnelRef = {
        account: '123456789012',
        region: 'us-east-1',
        via: {
          mechanism: 'aws.ssm' as const,
          bastion: { exid: 'test-bastion' },
        },
        into: { cluster: { name: 'test-db' } },
        from: { host: 'localhost', port: 5432 },
      };

      then('it should produce consistent hash', () => {
        hash1 = getTunnelHash({ for: { tunnel: tunnelRef } });
        hash2 = getTunnelHash({ for: { tunnel: tunnelRef } });
      });

      then('hashes should be equal', () => {
        expect(hash1).toBe(hash2);
      });

      then('hash should be 16 characters', () => {
        expect(hash1).toHaveLength(16);
        expect({ hash: hash1 }).toMatchSnapshot();
      });
    });
  });

  given('two different tunnel references', () => {
    when('hashed', () => {
      let hash1: string;
      let hash2: string;

      then('they should produce different hashes', () => {
        hash1 = getTunnelHash({
          for: {
            tunnel: {
              account: '123456789012',
              region: 'us-east-1',
              via: {
                mechanism: 'aws.ssm' as const,
                bastion: { exid: 'bastion-1' },
              },
              into: { cluster: { name: 'db-1' } },
              from: { host: 'localhost', port: 5432 },
            },
          },
        });
        hash2 = getTunnelHash({
          for: {
            tunnel: {
              account: '123456789012',
              region: 'us-east-1',
              via: {
                mechanism: 'aws.ssm' as const,
                bastion: { exid: 'bastion-2' },
              },
              into: { cluster: { name: 'db-2' } },
              from: { host: 'localhost', port: 5433 },
            },
          },
        });
      });

      then('hashes should be different', () => {
        expect(hash1).not.toBe(hash2);
      });
    });
  });

  given('same tunnel via/into/from with different account', () => {
    when('hashed', () => {
      let hash1: string;
      let hash2: string;

      then('they should produce different hashes', () => {
        hash1 = getTunnelHash({
          for: {
            tunnel: {
              account: '111111111111',
              region: 'us-east-1',
              via: {
                mechanism: 'aws.ssm' as const,
                bastion: { exid: 'test-bastion' },
              },
              into: { cluster: { name: 'test-db' } },
              from: { host: 'localhost', port: 5432 },
            },
          },
        });
        hash2 = getTunnelHash({
          for: {
            tunnel: {
              account: '222222222222',
              region: 'us-east-1',
              via: {
                mechanism: 'aws.ssm' as const,
                bastion: { exid: 'test-bastion' },
              },
              into: { cluster: { name: 'test-db' } },
              from: { host: 'localhost', port: 5432 },
            },
          },
        });
      });

      then('hashes should be different', () => {
        expect(hash1).not.toBe(hash2);
      });
    });
  });

  given('same tunnel via/into/from with different region', () => {
    when('hashed', () => {
      let hash1: string;
      let hash2: string;

      then('they should produce different hashes', () => {
        hash1 = getTunnelHash({
          for: {
            tunnel: {
              account: '123456789012',
              region: 'us-east-1',
              via: {
                mechanism: 'aws.ssm' as const,
                bastion: { exid: 'test-bastion' },
              },
              into: { cluster: { name: 'test-db' } },
              from: { host: 'localhost', port: 5432 },
            },
          },
        });
        hash2 = getTunnelHash({
          for: {
            tunnel: {
              account: '123456789012',
              region: 'us-west-2',
              via: {
                mechanism: 'aws.ssm' as const,
                bastion: { exid: 'test-bastion' },
              },
              into: { cluster: { name: 'test-db' } },
              from: { host: 'localhost', port: 5432 },
            },
          },
        });
      });

      then('hashes should be different', () => {
        expect(hash1).not.toBe(hash2);
      });
    });
  });
});
