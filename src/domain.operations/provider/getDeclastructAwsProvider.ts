import { DeclastructProvider } from 'declastruct';
import * as os from 'os';
import * as path from 'path';
import type { ContextLogTrail } from 'simple-log-methods';

import { DeclaredAwsEc2InstanceDao } from '../../access/daos/DeclaredAwsEc2InstanceDao';
import { DeclaredAwsRdsClusterDao } from '../../access/daos/DeclaredAwsRdsClusterDao';
import { DeclaredAwsVpcTunnelDao } from '../../access/daos/DeclaredAwsVpcTunnelDao';
import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclastructAwsProvider } from '../../domain.objects/DeclastructAwsProvider';

/**
 * .what = creates a declastruct provider for aws resources
 * .why = enables aws resource management via declastruct framework
 */
export const getDeclastructAwsProvider = (
  input: {
    credentials?: {
      region?: string;
      account?: string;
    };
    cache?: {
      DeclaredAwsVpcTunnel?: {
        processes?: {
          dir?: string;
        };
      };
    };
  },
  context: ContextLogTrail,
): DeclastructAwsProvider => {
  // resolve default tunnels cache directory
  const defaultTunnelsDir = path.join(os.homedir(), '.declastruct', 'tunnels');

  // build context from credentials and defaults
  const providerContext: ContextAwsApi & ContextLogTrail = {
    ...context,
    aws: {
      credentials: {
        region: input.credentials?.region,
        account: input.credentials?.account,
      },
      cache: {
        DeclaredAwsVpcTunnel: {
          processes: {
            dir:
              input.cache?.DeclaredAwsVpcTunnel?.processes?.dir ??
              defaultTunnelsDir,
          },
        },
      },
    },
  };

  // assemble DAOs for all aws resource types
  const daos = {
    DeclaredAwsEc2Instance: DeclaredAwsEc2InstanceDao,
    DeclaredAwsRdsCluster: DeclaredAwsRdsClusterDao,
    DeclaredAwsVpcTunnel: DeclaredAwsVpcTunnelDao,
  };

  // return provider with all required properties
  return new DeclastructProvider({
    name: 'aws',
    daos,
    context: providerContext,
    hooks: {
      beforeAll: async () => {
        // no setup needed for aws provider
      },
      afterAll: async () => {
        // no teardown needed for aws provider
      },
    },
  });
};
