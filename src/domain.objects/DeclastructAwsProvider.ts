import type { DeclastructDao, DeclastructProvider } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from './ContextAwsApi';
import type { DeclaredAwsBudget } from './DeclaredAwsBudget';
import type { DeclaredAwsBudgetAction } from './DeclaredAwsBudgetAction';
import type { DeclaredAwsBudgetNotification } from './DeclaredAwsBudgetNotification';
import type { DeclaredAwsCloudwatchLogGroup } from './DeclaredAwsCloudwatchLogGroup';
import type { DeclaredAwsCloudwatchLogGroupReportCostOfIngestion } from './DeclaredAwsCloudwatchLogGroupReportCostOfIngestion';
import type { DeclaredAwsCloudwatchLogGroupReportDistOfPattern } from './DeclaredAwsCloudwatchLogGroupReportDistOfPattern';
import type { DeclaredAwsCloudwatchMetricAlarm } from './DeclaredAwsCloudwatchMetricAlarm';
import type { DeclaredAwsCostAnomalyMonitor } from './DeclaredAwsCostAnomalyMonitor';
import type { DeclaredAwsCostAnomalySubscription } from './DeclaredAwsCostAnomalySubscription';
import type { DeclaredAwsCostExplorerPreference } from './DeclaredAwsCostExplorerPreference';
import type { DeclaredAwsCostReportRecommendationsToPurchasePlan } from './DeclaredAwsCostReportRecommendationsToPurchasePlan';
import type { DeclaredAwsCostReportRecommendationsToRightsize } from './DeclaredAwsCostReportRecommendationsToRightsize';
import type { DeclaredAwsCostReportSpendForecast } from './DeclaredAwsCostReportSpendForecast';
import type { DeclaredAwsCostReportSpendObserved } from './DeclaredAwsCostReportSpendObserved';
import type { DeclaredAwsCostReportSpendObservedByResource } from './DeclaredAwsCostReportSpendObservedByResource';
import type { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';
import type { DeclaredAwsEc2SshKeyAuthorized } from './DeclaredAwsEc2SshKeyAuthorized';
import type { DeclaredAwsIamInstanceProfile } from './DeclaredAwsIamInstanceProfile';
import type { DeclaredAwsIamOidcProvider } from './DeclaredAwsIamOidcProvider';
import type { DeclaredAwsIamRole } from './DeclaredAwsIamRole';
import type { DeclaredAwsIamRolePolicyAttachedInline } from './DeclaredAwsIamRolePolicyAttachedInline';
import type { DeclaredAwsIamRolePolicyAttachedManaged } from './DeclaredAwsIamRolePolicyAttachedManaged';
import type { DeclaredAwsLambda } from './DeclaredAwsLambda';
import type { DeclaredAwsLambdaAlias } from './DeclaredAwsLambdaAlias';
import type { DeclaredAwsLambdaVersion } from './DeclaredAwsLambdaVersion';
import type { DeclaredAwsOrganization } from './DeclaredAwsOrganization';
import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';
import type { DeclaredAwsOrganizationPolicyEligibility } from './DeclaredAwsOrganizationPolicyEligibility';
import type { DeclaredAwsOrganizationServiceControlPolicy } from './DeclaredAwsOrganizationServiceControlPolicy';
import type { DeclaredAwsOrganizationServiceControlPolicyAttachment } from './DeclaredAwsOrganizationServiceControlPolicyAttachment';
import type { DeclaredAwsRdsCluster } from './DeclaredAwsRdsCluster';
import type { DeclaredAwsSsmParameterPlain } from './DeclaredAwsSsmParameterPlain';
import type { DeclaredAwsSsmParameterSecure } from './DeclaredAwsSsmParameterSecure';
import type { DeclaredAwsSsmSshTunnel } from './DeclaredAwsSsmSshTunnel';
import type { DeclaredAwsSsmVpcTunnel } from './DeclaredAwsSsmVpcTunnel';
import type { DeclaredAwsSsoAccountAssignment } from './DeclaredAwsSsoAccountAssignment';
import type { DeclaredAwsSsoInstance } from './DeclaredAwsSsoInstance';
import type { DeclaredAwsSsoPermissionSet } from './DeclaredAwsSsoPermissionSet';
import type { DeclaredAwsSsoUser } from './DeclaredAwsSsoUser';

/**
 * .what = the declastruct provider for aws resources
 * .why = provides type safety and reusability for the aws provider
 */
export type DeclastructAwsProvider = DeclastructProvider<
  {
    DeclaredAwsBudget: DeclastructDao<
      typeof DeclaredAwsBudget,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsBudgetNotification: DeclastructDao<
      typeof DeclaredAwsBudgetNotification,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsBudgetAction: DeclastructDao<
      typeof DeclaredAwsBudgetAction,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCostAnomalyMonitor: DeclastructDao<
      typeof DeclaredAwsCostAnomalyMonitor,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCostAnomalySubscription: DeclastructDao<
      typeof DeclaredAwsCostAnomalySubscription,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCostExplorerPreference: DeclastructDao<
      typeof DeclaredAwsCostExplorerPreference,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCostReportSpendObserved: DeclastructDao<
      typeof DeclaredAwsCostReportSpendObserved,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCostReportSpendObservedByResource: DeclastructDao<
      typeof DeclaredAwsCostReportSpendObservedByResource,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCostReportSpendForecast: DeclastructDao<
      typeof DeclaredAwsCostReportSpendForecast,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCostReportRecommendationsToRightsize: DeclastructDao<
      typeof DeclaredAwsCostReportRecommendationsToRightsize,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCostReportRecommendationsToPurchasePlan: DeclastructDao<
      typeof DeclaredAwsCostReportRecommendationsToPurchasePlan,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsEc2Instance: DeclastructDao<
      typeof DeclaredAwsEc2Instance,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsEc2SshKeyAuthorized: DeclastructDao<
      typeof DeclaredAwsEc2SshKeyAuthorized,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsIamInstanceProfile: DeclastructDao<
      typeof DeclaredAwsIamInstanceProfile,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsIamOidcProvider: DeclastructDao<
      typeof DeclaredAwsIamOidcProvider,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsIamRole: DeclastructDao<
      typeof DeclaredAwsIamRole,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsIamRolePolicyAttachedInline: DeclastructDao<
      typeof DeclaredAwsIamRolePolicyAttachedInline,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsIamRolePolicyAttachedManaged: DeclastructDao<
      typeof DeclaredAwsIamRolePolicyAttachedManaged,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsLambda: DeclastructDao<
      typeof DeclaredAwsLambda,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsLambdaAlias: DeclastructDao<
      typeof DeclaredAwsLambdaAlias,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsLambdaVersion: DeclastructDao<
      typeof DeclaredAwsLambdaVersion,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCloudwatchLogGroup: DeclastructDao<
      typeof DeclaredAwsCloudwatchLogGroup,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCloudwatchLogGroupReportCostOfIngestion: DeclastructDao<
      typeof DeclaredAwsCloudwatchLogGroupReportCostOfIngestion,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCloudwatchLogGroupReportDistOfPattern: DeclastructDao<
      typeof DeclaredAwsCloudwatchLogGroupReportDistOfPattern,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsCloudwatchMetricAlarm: DeclastructDao<
      typeof DeclaredAwsCloudwatchMetricAlarm,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsOrganization: DeclastructDao<
      typeof DeclaredAwsOrganization,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsOrganizationAccount: DeclastructDao<
      typeof DeclaredAwsOrganizationAccount,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsOrganizationPolicyEligibility: DeclastructDao<
      typeof DeclaredAwsOrganizationPolicyEligibility,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsOrganizationServiceControlPolicy: DeclastructDao<
      typeof DeclaredAwsOrganizationServiceControlPolicy,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsOrganizationServiceControlPolicyAttachment: DeclastructDao<
      typeof DeclaredAwsOrganizationServiceControlPolicyAttachment,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsRdsCluster: DeclastructDao<
      typeof DeclaredAwsRdsCluster,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsSsoAccountAssignment: DeclastructDao<
      typeof DeclaredAwsSsoAccountAssignment,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsSsoInstance: DeclastructDao<
      typeof DeclaredAwsSsoInstance,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsSsoPermissionSet: DeclastructDao<
      typeof DeclaredAwsSsoPermissionSet,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsSsoUser: DeclastructDao<
      typeof DeclaredAwsSsoUser,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsSsmVpcTunnel: DeclastructDao<
      typeof DeclaredAwsSsmVpcTunnel,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsSsmSshTunnel: DeclastructDao<
      typeof DeclaredAwsSsmSshTunnel,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsSsmParameterPlain: DeclastructDao<
      typeof DeclaredAwsSsmParameterPlain,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsSsmParameterSecure: DeclastructDao<
      typeof DeclaredAwsSsmParameterSecure,
      ContextAwsApi & ContextLogTrail
    >;
  },
  ContextAwsApi & ContextLogTrail
>;
