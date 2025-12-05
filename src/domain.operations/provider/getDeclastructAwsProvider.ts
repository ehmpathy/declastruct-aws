import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';
import { DeclastructProvider } from 'declastruct';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import type { ContextLogTrail } from 'simple-log-methods';

import { DeclaredAwsEc2InstanceDao } from '../../access/daos/DeclaredAwsEc2InstanceDao';
import { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
import { DeclaredAwsIamRolePolicyDao } from '../../access/daos/DeclaredAwsIamRolePolicyDao';
import { DeclaredAwsLambdaAliasDao } from '../../access/daos/DeclaredAwsLambdaAliasDao';
import { DeclaredAwsLambdaDao } from '../../access/daos/DeclaredAwsLambdaDao';
import { DeclaredAwsLambdaVersionDao } from '../../access/daos/DeclaredAwsLambdaVersionDao';
import { DeclaredAwsLogGroupDao } from '../../access/daos/DeclaredAwsLogGroupDao';
import { DeclaredAwsLogGroupReportCostOfIngestionDao } from '../../access/daos/DeclaredAwsLogGroupReportCostOfIngestionDao';
import { DeclaredAwsLogGroupReportDistOfPatternDao } from '../../access/daos/DeclaredAwsLogGroupReportDistOfPatternDao';
import { DeclaredAwsRdsClusterDao } from '../../access/daos/DeclaredAwsRdsClusterDao';
import { DeclaredAwsVpcTunnelDao } from '../../access/daos/DeclaredAwsVpcTunnelDao';
import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclastructAwsProvider } from '../../domain.objects/DeclastructAwsProvider';

/**
 * .what = creates a declastruct provider for aws resources
 * .why = enables aws resource management via declastruct framework
 * .note = credentials are always resolved from current auth (env vars + STS)
 */
export const getDeclastructAwsProvider = async (
  input: {
    cache?: {
      DeclaredAwsVpcTunnel?: {
        processes?: {
          dir?: string;
        };
      };
    };
  },
  context: ContextLogTrail,
): Promise<DeclastructAwsProvider> => {
  // resolve default tunnels cache directory
  const defaultTunnelsDir = path.join(os.homedir(), '.declastruct', 'tunnels');

  // resolve credentials from current auth
  const credentials = await getCredentials();

  // build context from credentials and defaults
  const providerContext: ContextAwsApi & ContextLogTrail = {
    ...context,
    aws: {
      credentials,
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
    DeclaredAwsIamRole: DeclaredAwsIamRoleDao,
    DeclaredAwsIamRolePolicy: DeclaredAwsIamRolePolicyDao,
    DeclaredAwsLambda: DeclaredAwsLambdaDao,
    DeclaredAwsLambdaAlias: DeclaredAwsLambdaAliasDao,
    DeclaredAwsLambdaVersion: DeclaredAwsLambdaVersionDao,
    DeclaredAwsLogGroup: DeclaredAwsLogGroupDao,
    DeclaredAwsLogGroupReportDistOfPattern:
      DeclaredAwsLogGroupReportDistOfPatternDao,
    DeclaredAwsLogGroupReportCostOfIngestion:
      DeclaredAwsLogGroupReportCostOfIngestionDao,
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
        // no setup needed - credentials resolved at instantiation
      },
      afterAll: async () => {
        // no teardown needed for aws provider
      },
    },
  });
};

/**
 * .what = resolves aws credentials from current auth
 * .why = ensures credentials always reflect actual AWS auth state
 * .note = region from env vars or aws config file, account from STS identity
 */
const getCredentials = async (): Promise<{
  region: string;
  account: string;
}> => {
  // resolve region from env vars or aws config file
  const region = await getRegionFromEnvOrConfig();

  // failfast if region not available
  if (!region)
    BadRequestError.throw(
      'AWS region not specified. Set AWS_REGION, AWS_DEFAULT_REGION env var, or configure region in ~/.aws/config.',
    );

  // resolve account from STS identity
  const account = await getAccountFromSts();

  return { region, account };
};

/**
 * .what = resolves aws region from env vars or aws config file
 * .why = enables region inference from profile config without explicit env var
 * .note = priority: AWS_REGION > AWS_DEFAULT_REGION > config file profile region
 */
const getRegionFromEnvOrConfig = async (): Promise<string | undefined> => {
  // check env vars first (highest priority)
  const envRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (envRegion) return envRegion;

  // fallback to aws config file profile
  const profile = process.env.AWS_PROFILE ?? 'default';
  const configFiles = await loadSharedConfigFiles();
  const profileConfig = configFiles.credentialsFile?.[profile];

  return profileConfig?.region;
};

/**
 * .what = resolves aws account id from sts
 * .why = ensures account always reflects actual AWS auth state
 * .note = account is not region-dependent; STS uses default credential chain
 */
const getAccountFromSts = async (): Promise<string> => {
  const sts = new STSClient({});
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  return (
    identity.Account ??
    UnexpectedCodePathError.throw('failed to resolve AWS account id from STS')
  );
};
