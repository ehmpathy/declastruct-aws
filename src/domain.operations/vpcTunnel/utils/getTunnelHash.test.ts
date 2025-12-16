import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getTunnelHash } from './getTunnelHash';

describe('getTunnelHash', () => {
  const context = getMockedAwsApiContext();

  given('a tunnel reference', () => {
    when('hashed twice', () => {
      let hash1: string;
      let hash2: string;

      const tunnelRef = {
        via: {
          mechanism: 'aws.ssm' as const,
          bastion: { exid: 'test-bastion' },
        },
        into: { cluster: { name: 'test-db' } },
        from: { host: 'localhost', port: 5432 },
      };

      then('it should produce consistent hash', () => {
        hash1 = getTunnelHash({ for: { tunnel: tunnelRef } }, context);
        hash2 = getTunnelHash({ for: { tunnel: tunnelRef } }, context);
      });

      then('hashes should be equal', () => {
        expect(hash1).toBe(hash2);
      });

      then('hash should be 16 characters', () => {
        expect(hash1).toHaveLength(16);
      });
    });
  });

  given('two different tunnel references', () => {
    when('hashed', () => {
      let hash1: string;
      let hash2: string;

      then('they should produce different hashes', () => {
        hash1 = getTunnelHash(
          {
            for: {
              tunnel: {
                via: {
                  mechanism: 'aws.ssm' as const,
                  bastion: { exid: 'bastion-1' },
                },
                into: { cluster: { name: 'db-1' } },
                from: { host: 'localhost', port: 5432 },
              },
            },
          },
          context,
        );
        hash2 = getTunnelHash(
          {
            for: {
              tunnel: {
                via: {
                  mechanism: 'aws.ssm' as const,
                  bastion: { exid: 'bastion-2' },
                },
                into: { cluster: { name: 'db-2' } },
                from: { host: 'localhost', port: 5433 },
              },
            },
          },
          context,
        );
      });

      then('hashes should be different', () => {
        expect(hash1).not.toBe(hash2);
      });
    });
  });

  given('same tunnel with different credentials', () => {
    when('hashed', () => {
      let hash1: string;
      let hash2: string;

      const tunnelRef = {
        via: {
          mechanism: 'aws.ssm' as const,
          bastion: { exid: 'test-bastion' },
        },
        into: { cluster: { name: 'test-db' } },
        from: { host: 'localhost', port: 5432 },
      };

      then('they should produce different hashes', () => {
        const context1 = {
          aws: {
            credentials: { account: '111111111111', region: 'us-east-1' },
            cache: { DeclaredAwsVpcTunnel: { processes: { dir: '/tmp' } } },
          },
        };
        const context2 = {
          aws: {
            credentials: { account: '222222222222', region: 'us-west-2' },
            cache: { DeclaredAwsVpcTunnel: { processes: { dir: '/tmp' } } },
          },
        };

        hash1 = getTunnelHash({ for: { tunnel: tunnelRef } }, context1);
        hash2 = getTunnelHash({ for: { tunnel: tunnelRef } }, context2);
      });

      then('hashes should be different', () => {
        expect(hash1).not.toBe(hash2);
      });
    });
  });
});
