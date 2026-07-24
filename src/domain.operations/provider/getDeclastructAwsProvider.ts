import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';
import { DeclastructProvider } from 'declastruct';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import type { ContextLogTrail } from 'sdk-logs';

import { DeclaredAwsBudgetActionDao } from '@src/access/daos/DeclaredAwsBudgetActionDao';
import { DeclaredAwsBudgetDao } from '@src/access/daos/DeclaredAwsBudgetDao';
import { DeclaredAwsBudgetNotificationDao } from '@src/access/daos/DeclaredAwsBudgetNotificationDao';
import { DeclaredAwsCloudwatchLogGroupDao } from '@src/access/daos/DeclaredAwsCloudwatchLogGroupDao';
import { DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao } from '@src/access/daos/DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao';
import { DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao } from '@src/access/daos/DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao';
import { DeclaredAwsCloudwatchMetricAlarmDao } from '@src/access/daos/DeclaredAwsCloudwatchMetricAlarmDao';
import { DeclaredAwsCostAnomalyMonitorDao } from '@src/access/daos/DeclaredAwsCostAnomalyMonitorDao';
import { DeclaredAwsCostAnomalySubscriptionDao } from '@src/access/daos/DeclaredAwsCostAnomalySubscriptionDao';
import { DeclaredAwsCostExplorerPreferenceDao } from '@src/access/daos/DeclaredAwsCostExplorerPreferenceDao';
import { DeclaredAwsCostReportRecommendationsToPurchasePlanDao } from '@src/access/daos/DeclaredAwsCostReportRecommendationsToPurchasePlanDao';
import { DeclaredAwsCostReportRecommendationsToRightsizeDao } from '@src/access/daos/DeclaredAwsCostReportRecommendationsToRightsizeDao';
import { DeclaredAwsCostReportSpendForecastDao } from '@src/access/daos/DeclaredAwsCostReportSpendForecastDao';
import { DeclaredAwsCostReportSpendObservedByResourceDao } from '@src/access/daos/DeclaredAwsCostReportSpendObservedByResourceDao';
import { DeclaredAwsCostReportSpendObservedDao } from '@src/access/daos/DeclaredAwsCostReportSpendObservedDao';
import { DeclaredAwsEc2InstanceDao } from '@src/access/daos/DeclaredAwsEc2InstanceDao';
import { DeclaredAwsEc2InstanceSessionDao } from '@src/access/daos/DeclaredAwsEc2InstanceSessionDao';
import { DeclaredAwsEc2LaunchTemplateDao } from '@src/access/daos/DeclaredAwsEc2LaunchTemplateDao';
import { DeclaredAwsEc2SshKeyAuthorizedDao } from '@src/access/daos/DeclaredAwsEc2SshKeyAuthorizedDao';
import { DeclaredAwsIamInstanceProfileDao } from '@src/access/daos/DeclaredAwsIamInstanceProfileDao';
import { DeclaredAwsIamOidcProviderDao } from '@src/access/daos/DeclaredAwsIamOidcProviderDao';
import { DeclaredAwsIamRoleDao } from '@src/access/daos/DeclaredAwsIamRoleDao';
import { DeclaredAwsIamRolePolicyAttachedInlineDao } from '@src/access/daos/DeclaredAwsIamRolePolicyAttachedInlineDao';
import { DeclaredAwsLambdaAliasDao } from '@src/access/daos/DeclaredAwsLambdaAliasDao';
import { DeclaredAwsLambdaDao } from '@src/access/daos/DeclaredAwsLambdaDao';
import { DeclaredAwsLambdaVersionDao } from '@src/access/daos/DeclaredAwsLambdaVersionDao';
import { DeclaredAwsOrganizationAccountDao } from '@src/access/daos/DeclaredAwsOrganizationAccountDao';
import { DeclaredAwsOrganizationDao } from '@src/access/daos/DeclaredAwsOrganizationDao';
import { DeclaredAwsOrganizationPolicyEligibilityDao } from '@src/access/daos/DeclaredAwsOrganizationPolicyEligibilityDao';
import { DeclaredAwsOrganizationServiceControlPolicyAttachmentDao } from '@src/access/daos/DeclaredAwsOrganizationServiceControlPolicyAttachmentDao';
import { DeclaredAwsOrganizationServiceControlPolicyDao } from '@src/access/daos/DeclaredAwsOrganizationServiceControlPolicyDao';
import { DeclaredAwsRdsClusterDao } from '@src/access/daos/DeclaredAwsRdsClusterDao';
import { DeclaredAwsSsmParameterPlainDao } from '@src/access/daos/DeclaredAwsSsmParameterPlainDao';
import { DeclaredAwsSsmParameterSecureDao } from '@src/access/daos/DeclaredAwsSsmParameterSecureDao';
import { DeclaredAwsSsmSshTunnelDao } from '@src/access/daos/DeclaredAwsSsmSshTunnelDao';
import { DeclaredAwsSsmVpcTunnelDao } from '@src/access/daos/DeclaredAwsSsmVpcTunnelDao';
import { DeclaredAwsSsoAccountAssignmentDao } from '@src/access/daos/DeclaredAwsSsoAccountAssignmentDao';
import { DeclaredAwsSsoInstanceDao } from '@src/access/daos/DeclaredAwsSsoInstanceDao';
import { DeclaredAwsSsoPermissionSetDao } from '@src/access/daos/DeclaredAwsSsoPermissionSetDao';
import { DeclaredAwsSsoUserDao } from '@src/access/daos/DeclaredAwsSsoUserDao';
import { DeclaredAwsVpcDao } from '@src/access/daos/DeclaredAwsVpcDao';
import { DeclaredAwsVpcInternetGatewayDao } from '@src/access/daos/DeclaredAwsVpcInternetGatewayDao';
import { DeclaredAwsVpcRouteTableDao } from '@src/access/daos/DeclaredAwsVpcRouteTableDao';
import { DeclaredAwsVpcSecurityGroupDao } from '@src/access/daos/DeclaredAwsVpcSecurityGroupDao';
import { DeclaredAwsVpcSubnetDao } from '@src/access/daos/DeclaredAwsVpcSubnetDao';
import { DeclaredAwsIamRolePolicyAttachedManagedDao } from '@src/contract/sdks';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclastructAwsProvider } from '@src/domain.objects/DeclastructAwsProvider';

/**
 * .what = creates a declastruct provider for aws resources
 * .why = enables aws resource management via declastruct framework
 * .note = credentials are always resolved from current auth (env vars + STS)
 */
export const getDeclastructAwsProvider = async (
  input: {
    cache?: {
      DeclaredAwsSsmVpcTunnel?: {
        processes?: {
          dir?: string;
        };
      };
      DeclaredAwsSsmSshTunnel?: {
        processes?: {
          dir?: string;
        };
      };
    };
  },
  context: ContextLogTrail,
): Promise<DeclastructAwsProvider> => {
  // derive default tunnels cache directories
  const defaultTunnelsDir = path.join(os.homedir(), '.declastruct', 'tunnels');
  const defaultSshTunnelsDir = path.join(
    os.homedir(),
    '.declastruct',
    'ssh-tunnels',
  );

  // resolve credentials from current auth
  const credentials = await getCredentials();

  // build context from credentials and defaults
  const providerContext: ContextAwsApi & ContextLogTrail = {
    ...context,
    aws: {
      credentials,
      cache: {
        DeclaredAwsSsmVpcTunnel: {
          processes: {
            dir:
              input.cache?.DeclaredAwsSsmVpcTunnel?.processes?.dir ??
              defaultTunnelsDir,
          },
        },
        DeclaredAwsSsmSshTunnel: {
          processes: {
            dir:
              input.cache?.DeclaredAwsSsmSshTunnel?.processes?.dir ??
              defaultSshTunnelsDir,
          },
        },
      },
    },
  };

  // assemble DAOs for all aws resource types
  const daos = {
    DeclaredAwsBudget: DeclaredAwsBudgetDao,
    DeclaredAwsBudgetNotification: DeclaredAwsBudgetNotificationDao,
    DeclaredAwsBudgetAction: DeclaredAwsBudgetActionDao,
    DeclaredAwsCostAnomalyMonitor: DeclaredAwsCostAnomalyMonitorDao,
    DeclaredAwsCostAnomalySubscription: DeclaredAwsCostAnomalySubscriptionDao,
    DeclaredAwsCostExplorerPreference: DeclaredAwsCostExplorerPreferenceDao,
    DeclaredAwsCostReportSpendObserved: DeclaredAwsCostReportSpendObservedDao,
    DeclaredAwsCostReportSpendObservedByResource:
      DeclaredAwsCostReportSpendObservedByResourceDao,
    DeclaredAwsCostReportSpendForecast: DeclaredAwsCostReportSpendForecastDao,
    DeclaredAwsCostReportRecommendationsToRightsize:
      DeclaredAwsCostReportRecommendationsToRightsizeDao,
    DeclaredAwsCostReportRecommendationsToPurchasePlan:
      DeclaredAwsCostReportRecommendationsToPurchasePlanDao,
    DeclaredAwsEc2Instance: DeclaredAwsEc2InstanceDao,
    DeclaredAwsEc2InstanceSession: DeclaredAwsEc2InstanceSessionDao,
    DeclaredAwsEc2LaunchTemplate: DeclaredAwsEc2LaunchTemplateDao,
    DeclaredAwsEc2SshKeyAuthorized: DeclaredAwsEc2SshKeyAuthorizedDao,
    DeclaredAwsIamInstanceProfile: DeclaredAwsIamInstanceProfileDao,
    DeclaredAwsIamOidcProvider: DeclaredAwsIamOidcProviderDao,
    DeclaredAwsIamRole: DeclaredAwsIamRoleDao,
    DeclaredAwsLambda: DeclaredAwsLambdaDao,
    DeclaredAwsLambdaAlias: DeclaredAwsLambdaAliasDao,
    DeclaredAwsLambdaVersion: DeclaredAwsLambdaVersionDao,
    DeclaredAwsCloudwatchLogGroup: DeclaredAwsCloudwatchLogGroupDao,
    DeclaredAwsCloudwatchLogGroupReportDistOfPattern:
      DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao,
    DeclaredAwsCloudwatchLogGroupReportCostOfIngestion:
      DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao,
    DeclaredAwsCloudwatchMetricAlarm: DeclaredAwsCloudwatchMetricAlarmDao,
    DeclaredAwsOrganization: DeclaredAwsOrganizationDao,
    DeclaredAwsOrganizationAccount: DeclaredAwsOrganizationAccountDao,
    DeclaredAwsOrganizationPolicyEligibility:
      DeclaredAwsOrganizationPolicyEligibilityDao,
    DeclaredAwsOrganizationServiceControlPolicy:
      DeclaredAwsOrganizationServiceControlPolicyDao,
    DeclaredAwsOrganizationServiceControlPolicyAttachment:
      DeclaredAwsOrganizationServiceControlPolicyAttachmentDao,
    DeclaredAwsRdsCluster: DeclaredAwsRdsClusterDao,
    DeclaredAwsSsoAccountAssignment: DeclaredAwsSsoAccountAssignmentDao,
    DeclaredAwsSsoInstance: DeclaredAwsSsoInstanceDao,
    DeclaredAwsSsoPermissionSet: DeclaredAwsSsoPermissionSetDao,
    DeclaredAwsSsoUser: DeclaredAwsSsoUserDao,
    DeclaredAwsVpc: DeclaredAwsVpcDao,
    DeclaredAwsVpcInternetGateway: DeclaredAwsVpcInternetGatewayDao,
    DeclaredAwsVpcRouteTable: DeclaredAwsVpcRouteTableDao,
    DeclaredAwsVpcSecurityGroup: DeclaredAwsVpcSecurityGroupDao,
    DeclaredAwsVpcSubnet: DeclaredAwsVpcSubnetDao,
    DeclaredAwsSsmVpcTunnel: DeclaredAwsSsmVpcTunnelDao,
    DeclaredAwsSsmSshTunnel: DeclaredAwsSsmSshTunnelDao,
    DeclaredAwsSsmParameterPlain: DeclaredAwsSsmParameterPlainDao,
    DeclaredAwsSsmParameterSecure: DeclaredAwsSsmParameterSecureDao,
    DeclaredAwsIamRolePolicyAttachedInline:
      DeclaredAwsIamRolePolicyAttachedInlineDao,
    DeclaredAwsIamRolePolicyAttachedManaged:
      DeclaredAwsIamRolePolicyAttachedManagedDao,
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
export const getCredentials = async (): Promise<{
  region: string;
  account: string;
}> => {
  // resolve region from env vars or aws config file
  const region = await getRegionFromEnvOrConfig();

  // failfast if region not available
  if (!region)
    BadRequestError.throw(
      'AWS region not specified. Set AWS_REGION, AWS_DEFAULT_REGION env var, or configure region in ~/.aws/config.',
      { hint: 'export AWS_REGION=us-east-1 or configure ~/.aws/config' },
    );

  // resolve account from STS identity
  const account = await getAccountFromSts();

  return { region, account };
};

/**
 * .what = resolves aws region from env vars or aws config file
 * .why = enables region inference from profile config without explicit env var
 * .note = priority: AWS_REGION > AWS_DEFAULT_REGION > config file region > sso_region
 */
const getRegionFromEnvOrConfig = async (): Promise<string | undefined> => {
  // check env vars first (highest priority)
  const envRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (envRegion) return envRegion;

  // fallback to aws config file profile
  const profile = process.env.AWS_PROFILE ?? 'default';
  const configFiles = await loadSharedConfigFiles();
  const profileConfig = configFiles.configFile?.[profile];

  // check region, then sso_region for SSO profiles
  return profileConfig?.region ?? profileConfig?.sso_region;
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
    UnexpectedCodePathError.throw('failed to get AWS account id from STS', {
      identity,
    })
  );
};
