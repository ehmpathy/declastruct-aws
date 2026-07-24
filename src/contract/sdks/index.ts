/**
 * .what = public SDK exports for declastruct-aws package
 * .why = enables consumers to use the declastruct provider interface and domain objects
 */

export { DeclaredAwsBudgetActionDao } from '@src/access/daos/DeclaredAwsBudgetActionDao';
export { DeclaredAwsBudgetDao } from '@src/access/daos/DeclaredAwsBudgetDao';
export { DeclaredAwsBudgetNotificationDao } from '@src/access/daos/DeclaredAwsBudgetNotificationDao';
export { DeclaredAwsCloudwatchLogGroupDao } from '@src/access/daos/DeclaredAwsCloudwatchLogGroupDao';
export { DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao } from '@src/access/daos/DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao';
export { DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao } from '@src/access/daos/DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao';
export { DeclaredAwsCloudwatchMetricAlarmDao } from '@src/access/daos/DeclaredAwsCloudwatchMetricAlarmDao';
export { DeclaredAwsCostAnomalyMonitorDao } from '@src/access/daos/DeclaredAwsCostAnomalyMonitorDao';
export { DeclaredAwsCostAnomalySubscriptionDao } from '@src/access/daos/DeclaredAwsCostAnomalySubscriptionDao';
export { DeclaredAwsCostExplorerPreferenceDao } from '@src/access/daos/DeclaredAwsCostExplorerPreferenceDao';
export { DeclaredAwsCostReportRecommendationsToPurchasePlanDao } from '@src/access/daos/DeclaredAwsCostReportRecommendationsToPurchasePlanDao';
export { DeclaredAwsCostReportRecommendationsToRightsizeDao } from '@src/access/daos/DeclaredAwsCostReportRecommendationsToRightsizeDao';
export { DeclaredAwsCostReportSpendForecastDao } from '@src/access/daos/DeclaredAwsCostReportSpendForecastDao';
export { DeclaredAwsCostReportSpendObservedByResourceDao } from '@src/access/daos/DeclaredAwsCostReportSpendObservedByResourceDao';
export { DeclaredAwsCostReportSpendObservedDao } from '@src/access/daos/DeclaredAwsCostReportSpendObservedDao';
// aws daos
export { DeclaredAwsEc2InstanceDao } from '@src/access/daos/DeclaredAwsEc2InstanceDao';
export { DeclaredAwsEc2InstanceSessionDao } from '@src/access/daos/DeclaredAwsEc2InstanceSessionDao';
export { DeclaredAwsEc2LaunchTemplateDao } from '@src/access/daos/DeclaredAwsEc2LaunchTemplateDao';
export { DeclaredAwsEc2SshKeyAuthorizedDao } from '@src/access/daos/DeclaredAwsEc2SshKeyAuthorizedDao';
// aws iam instance profile dao
export { DeclaredAwsIamInstanceProfileDao } from '@src/access/daos/DeclaredAwsIamInstanceProfileDao';
// aws iam oidc provider dao
export { DeclaredAwsIamOidcProviderDao } from '@src/access/daos/DeclaredAwsIamOidcProviderDao';
export { DeclaredAwsIamPolicyDao } from '@src/access/daos/DeclaredAwsIamPolicyDao';
export { DeclaredAwsIamRoleDao } from '@src/access/daos/DeclaredAwsIamRoleDao';
export { DeclaredAwsIamRolePolicyAttachedInlineDao } from '@src/access/daos/DeclaredAwsIamRolePolicyAttachedInlineDao';
export { DeclaredAwsIamRolePolicyAttachedManagedDao } from '@src/access/daos/DeclaredAwsIamRolePolicyAttachedManagedDao';
export { DeclaredAwsIamUserAccessKeyDao } from '@src/access/daos/DeclaredAwsIamUserAccessKeyDao';
export { DeclaredAwsLambdaAliasDao } from '@src/access/daos/DeclaredAwsLambdaAliasDao';
export { DeclaredAwsLambdaDao } from '@src/access/daos/DeclaredAwsLambdaDao';
export { DeclaredAwsLambdaVersionDao } from '@src/access/daos/DeclaredAwsLambdaVersionDao';
export { DeclaredAwsOrganizationAccountDao } from '@src/access/daos/DeclaredAwsOrganizationAccountDao';
export { DeclaredAwsOrganizationDao } from '@src/access/daos/DeclaredAwsOrganizationDao';
export { DeclaredAwsOrganizationPolicyEligibilityDao } from '@src/access/daos/DeclaredAwsOrganizationPolicyEligibilityDao';
export { DeclaredAwsOrganizationServiceControlPolicyAttachmentDao } from '@src/access/daos/DeclaredAwsOrganizationServiceControlPolicyAttachmentDao';
export { DeclaredAwsOrganizationServiceControlPolicyDao } from '@src/access/daos/DeclaredAwsOrganizationServiceControlPolicyDao';
export { DeclaredAwsRdsClusterDao } from '@src/access/daos/DeclaredAwsRdsClusterDao';
export { DeclaredAwsSsmParameterPlainDao } from '@src/access/daos/DeclaredAwsSsmParameterPlainDao';
export { DeclaredAwsSsmParameterSecureDao } from '@src/access/daos/DeclaredAwsSsmParameterSecureDao';
export { DeclaredAwsSsmSshTunnelDao } from '@src/access/daos/DeclaredAwsSsmSshTunnelDao';
export { DeclaredAwsSsmVpcTunnelDao } from '@src/access/daos/DeclaredAwsSsmVpcTunnelDao';
// aws sso daos
export { DeclaredAwsSsoAccountAssignmentDao } from '@src/access/daos/DeclaredAwsSsoAccountAssignmentDao';
export { DeclaredAwsSsoInstanceDao } from '@src/access/daos/DeclaredAwsSsoInstanceDao';
export { DeclaredAwsSsoPermissionSetDao } from '@src/access/daos/DeclaredAwsSsoPermissionSetDao';
// note: DeclaredAwsSsoInstance does not have its own DAO - use getOneSsoInstance/setSsoInstance directly
export { DeclaredAwsSsoUserDao } from '@src/access/daos/DeclaredAwsSsoUserDao';
// aws vpc daos
export { DeclaredAwsVpcDao } from '@src/access/daos/DeclaredAwsVpcDao';
export { DeclaredAwsVpcInternetGatewayDao } from '@src/access/daos/DeclaredAwsVpcInternetGatewayDao';
export { DeclaredAwsVpcRouteTableDao } from '@src/access/daos/DeclaredAwsVpcRouteTableDao';
export { DeclaredAwsVpcSecurityGroupDao } from '@src/access/daos/DeclaredAwsVpcSecurityGroupDao';
export { DeclaredAwsVpcSubnetDao } from '@src/access/daos/DeclaredAwsVpcSubnetDao';
// aws budget domain objects
export { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
export { DeclaredAwsBudgetAction } from '@src/domain.objects/DeclaredAwsBudgetAction';
export { DeclaredAwsBudgetActionDefinition } from '@src/domain.objects/DeclaredAwsBudgetActionDefinition';
export { DeclaredAwsBudgetActionIam } from '@src/domain.objects/DeclaredAwsBudgetActionIam';
export { DeclaredAwsBudgetActionScp } from '@src/domain.objects/DeclaredAwsBudgetActionScp';
export { DeclaredAwsBudgetActionSsm } from '@src/domain.objects/DeclaredAwsBudgetActionSsm';
export { DeclaredAwsBudgetLimit } from '@src/domain.objects/DeclaredAwsBudgetLimit';
export { DeclaredAwsBudgetNotification } from '@src/domain.objects/DeclaredAwsBudgetNotification';
export { DeclaredAwsBudgetSubscriber } from '@src/domain.objects/DeclaredAwsBudgetSubscriber';
export { DeclaredAwsBudgetThreshold } from '@src/domain.objects/DeclaredAwsBudgetThreshold';
// aws log group domain objects
export { DeclaredAwsCloudwatchLogGroup } from '@src/domain.objects/DeclaredAwsCloudwatchLogGroup';
export {
  type DeclaredAwsCloudwatchLogGroupFilter,
  DeclaredAwsCloudwatchLogGroupReportCostOfIngestion,
  DeclaredAwsCloudwatchLogGroupReportCostOfIngestionRow,
} from '@src/domain.objects/DeclaredAwsCloudwatchLogGroupReportCostOfIngestion';
export {
  DeclaredAwsCloudwatchLogGroupReportDistOfPattern,
  DeclaredAwsCloudwatchLogGroupReportDistOfPatternRow,
} from '@src/domain.objects/DeclaredAwsCloudwatchLogGroupReportDistOfPattern';
export { DeclaredAwsCloudwatchMetricAlarm } from '@src/domain.objects/DeclaredAwsCloudwatchMetricAlarm';
// aws cost report domain objects
export { DeclaredAwsCostAmount } from '@src/domain.objects/DeclaredAwsCostAmount';
// aws cost anomaly domain objects
export { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';
export { DeclaredAwsCostAnomalySubscriber } from '@src/domain.objects/DeclaredAwsCostAnomalySubscriber';
export { DeclaredAwsCostAnomalySubscription } from '@src/domain.objects/DeclaredAwsCostAnomalySubscription';
export { DeclaredAwsCostExplorerPreference } from '@src/domain.objects/DeclaredAwsCostExplorerPreference';
export { DeclaredAwsCostReportFilter } from '@src/domain.objects/DeclaredAwsCostReportFilter';
export {
  DeclaredAwsCostReportRecommendationsToPurchasePlan,
  DeclaredAwsCostReportRecommendationsToPurchasePlanItem,
  DeclaredAwsCostReportRecommendationsToPurchasePlanSummary,
} from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToPurchasePlan';
export {
  DeclaredAwsCostReportRecommendationsToRightsize,
  DeclaredAwsCostReportRecommendationsToRightsizeItem,
  DeclaredAwsCostReportRecommendationsToRightsizeSummary,
} from '@src/domain.objects/DeclaredAwsCostReportRecommendationsToRightsize';
export {
  DeclaredAwsCostReportSpendForecast,
  DeclaredAwsCostReportSpendForecastPoint,
} from '@src/domain.objects/DeclaredAwsCostReportSpendForecast';
export {
  DeclaredAwsCostReportSpendObserved,
  DeclaredAwsCostReportSpendObservedBucket,
  DeclaredAwsCostReportSpendObservedGroup,
  type DeclaredAwsCostReportSpendObservedGroupBy,
} from '@src/domain.objects/DeclaredAwsCostReportSpendObserved';
export {
  DeclaredAwsCostReportSpendObservedByResource,
  DeclaredAwsCostReportSpendObservedByResourceBucket,
  DeclaredAwsCostReportSpendObservedByResourceGroup,
} from '@src/domain.objects/DeclaredAwsCostReportSpendObservedByResource';
// aws domain objects
export { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
export { DeclaredAwsEc2InstanceNetwork } from '@src/domain.objects/DeclaredAwsEc2InstanceNetwork';
export { DeclaredAwsEc2InstanceNetworkInterface } from '@src/domain.objects/DeclaredAwsEc2InstanceNetworkInterface';
export { DeclaredAwsEc2InstanceNetworkSecurity } from '@src/domain.objects/DeclaredAwsEc2InstanceNetworkSecurity';
export { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
export { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';
export { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
// aws iam instance profile domain objects
export { DeclaredAwsIamInstanceProfile } from '@src/domain.objects/DeclaredAwsIamInstanceProfile';
// aws iam oidc provider domain objects
export { DeclaredAwsIamOidcProvider } from '@src/domain.objects/DeclaredAwsIamOidcProvider';
export { DeclaredAwsIamPolicy } from '@src/domain.objects/DeclaredAwsIamPolicy';
export { DeclaredAwsIamPolicyBundle } from '@src/domain.objects/DeclaredAwsIamPolicyBundle';
export { DeclaredAwsIamPolicyDocument } from '@src/domain.objects/DeclaredAwsIamPolicyDocument';
export { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';
export { DeclaredAwsIamPrincipal } from '@src/domain.objects/DeclaredAwsIamPrincipal';
export { DeclaredAwsIamPrincipalScope } from '@src/domain.objects/DeclaredAwsIamPrincipalScope';
export { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
export { DeclaredAwsIamRolePolicyAttachedInline } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedInline';
export { DeclaredAwsIamRolePolicyAttachedManaged } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedManaged';
export { DeclaredAwsIamStatementScope } from '@src/domain.objects/DeclaredAwsIamStatementScope';
export { DeclaredAwsIamUser } from '@src/domain.objects/DeclaredAwsIamUser';
export { DeclaredAwsIamUserAccessKey } from '@src/domain.objects/DeclaredAwsIamUserAccessKey';
export { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';
export { DeclaredAwsLambdaAlias } from '@src/domain.objects/DeclaredAwsLambdaAlias';
export { DeclaredAwsLambdaCode } from '@src/domain.objects/DeclaredAwsLambdaCode';
export { DeclaredAwsLambdaVersion } from '@src/domain.objects/DeclaredAwsLambdaVersion';
export { DeclaredAwsLambdaVersionHash } from '@src/domain.objects/DeclaredAwsLambdaVersionHash';
// aws organization + organization account domain objects
export { DeclaredAwsOrganization } from '@src/domain.objects/DeclaredAwsOrganization';
export { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';
export { DeclaredAwsOrganizationPolicyEligibility } from '@src/domain.objects/DeclaredAwsOrganizationPolicyEligibility';
export { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
export { DeclaredAwsOrganizationServiceControlPolicyAttachment } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicyAttachment';
export { DeclaredAwsRdsCluster } from '@src/domain.objects/DeclaredAwsRdsCluster';
// aws ssm domain objects
export { DeclaredAwsSsmParameterPlain } from '@src/domain.objects/DeclaredAwsSsmParameterPlain';
export { DeclaredAwsSsmParameterSecure } from '@src/domain.objects/DeclaredAwsSsmParameterSecure';
export { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';
/** @deprecated use DeclaredAwsSsmVpcTunnel */
export {
  DeclaredAwsSsmVpcTunnel,
  DeclaredAwsSsmVpcTunnel as DeclaredAwsVpcTunnel,
} from '@src/domain.objects/DeclaredAwsSsmVpcTunnel';
// aws sso domain objects
export { DeclaredAwsSsoAccountAssignment } from '@src/domain.objects/DeclaredAwsSsoAccountAssignment';
export { DeclaredAwsSsoInstance } from '@src/domain.objects/DeclaredAwsSsoInstance';
export { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';
export { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';
export { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';
// aws vpc domain objects
export { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';
export { DeclaredAwsVpcCidrBlock } from '@src/domain.objects/DeclaredAwsVpcCidrBlock';
export { DeclaredAwsVpcInternetGateway } from '@src/domain.objects/DeclaredAwsVpcInternetGateway';
export { DeclaredAwsVpcRoute } from '@src/domain.objects/DeclaredAwsVpcRoute';
export { DeclaredAwsVpcRouteDestination } from '@src/domain.objects/DeclaredAwsVpcRouteDestination';
export { DeclaredAwsVpcRouteTable } from '@src/domain.objects/DeclaredAwsVpcRouteTable';
export { DeclaredAwsVpcRouteTableAssociation } from '@src/domain.objects/DeclaredAwsVpcRouteTableAssociation';
export { DeclaredAwsVpcRouteTargetNatInstance } from '@src/domain.objects/DeclaredAwsVpcRouteTargetNatInstance';
export { DeclaredAwsVpcSecurityGroup } from '@src/domain.objects/DeclaredAwsVpcSecurityGroup';
export { DeclaredAwsVpcSecurityGroupRule } from '@src/domain.objects/DeclaredAwsVpcSecurityGroupRule';
export { DeclaredAwsVpcSecurityGroupRules } from '@src/domain.objects/DeclaredAwsVpcSecurityGroupRules';
export { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';
export type { DeclastructAwsProvider } from '@src/domain.objects/DeclastructAwsProvider';
export { delBudget } from '@src/domain.operations/budget/delBudget';
export { getOneBudget } from '@src/domain.operations/budget/getOneBudget';
export { setBudget } from '@src/domain.operations/budget/setBudget';
// aws budget action operations
export { delBudgetAction } from '@src/domain.operations/budgetAction/delBudgetAction';
export { getOneBudgetAction } from '@src/domain.operations/budgetAction/getOneBudgetAction';
export { setBudgetAction } from '@src/domain.operations/budgetAction/setBudgetAction';
// aws budget notification operations
export { delBudgetNotification } from '@src/domain.operations/budgetNotification/delBudgetNotification';
export { getOneBudgetNotification } from '@src/domain.operations/budgetNotification/getOneBudgetNotification';
export { setBudgetNotification } from '@src/domain.operations/budgetNotification/setBudgetNotification';
// aws log group operations
export { getAllCloudwatchLogGroups } from '@src/domain.operations/cloudwatchLogGroup/getAllCloudwatchLogGroups';
export { getOneCloudwatchLogGroup } from '@src/domain.operations/cloudwatchLogGroup/getOneCloudwatchLogGroup';
export { setCloudwatchLogGroup } from '@src/domain.operations/cloudwatchLogGroup/setCloudwatchLogGroup';
export { getOneCloudwatchLogGroupReportCostOfIngestion } from '@src/domain.operations/cloudwatchLogGroupReportCostOfIngestion/getOneCloudwatchLogGroupReportCostOfIngestion';
export { getOneCloudwatchLogGroupReportDistOfPattern } from '@src/domain.operations/cloudwatchLogGroupReportDistOfPattern/getOneCloudwatchLogGroupReportDistOfPattern';
export { delCloudwatchMetricAlarm } from '@src/domain.operations/cloudwatchMetricAlarm/delCloudwatchMetricAlarm';
export { getOneCloudwatchMetricAlarm } from '@src/domain.operations/cloudwatchMetricAlarm/getOneCloudwatchMetricAlarm';
export { setCloudwatchMetricAlarm } from '@src/domain.operations/cloudwatchMetricAlarm/setCloudwatchMetricAlarm';
// aws cost anomaly monitor operations
export { delCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/delCostAnomalyMonitor';
export { getOneCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/getOneCostAnomalyMonitor';
export { setCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/setCostAnomalyMonitor';
// aws cost anomaly subscription operations
export { delCostAnomalySubscription } from '@src/domain.operations/costAnomalySubscription/delCostAnomalySubscription';
export { getOneCostAnomalySubscription } from '@src/domain.operations/costAnomalySubscription/getOneCostAnomalySubscription';
export { setCostAnomalySubscription } from '@src/domain.operations/costAnomalySubscription/setCostAnomalySubscription';
// aws cost explorer preference operations
export {
  COST_EXPLORER_PREFERENCE_FEATURES,
  type CostExplorerPreferenceFeature,
} from '@src/domain.operations/costExplorerPreference/COST_EXPLORER_PREFERENCE_FEATURES';
export { getCostExplorerPreferenceGuidanceError } from '@src/domain.operations/costExplorerPreference/getCostExplorerPreferenceGuidanceError';
export { getOneCostExplorerPreference } from '@src/domain.operations/costExplorerPreference/getOneCostExplorerPreference';
export { isResourceLevelDataOptInDisabledError } from '@src/domain.operations/costExplorerPreference/isResourceLevelDataOptInDisabledError';
export { isRightsizeOptInDisabledError } from '@src/domain.operations/costExplorerPreference/isRightsizeOptInDisabledError';
export { castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan } from '@src/domain.operations/costReportRecommendationsToPurchasePlan/castIntoDeclaredAwsCostReportRecommendationsToPurchasePlan';
export { getOneCostReportRecommendationsToPurchasePlan } from '@src/domain.operations/costReportRecommendationsToPurchasePlan/getOneCostReportRecommendationsToPurchasePlan';
export { castIntoDeclaredAwsCostReportRecommendationsToRightsize } from '@src/domain.operations/costReportRecommendationsToRightsize/castIntoDeclaredAwsCostReportRecommendationsToRightsize';
export { getOneCostReportRecommendationsToRightsize } from '@src/domain.operations/costReportRecommendationsToRightsize/getOneCostReportRecommendationsToRightsize';
export { castIntoDeclaredAwsCostReportSpendForecast } from '@src/domain.operations/costReportSpendForecast/castIntoDeclaredAwsCostReportSpendForecast';
export { getOneCostReportSpendForecast } from '@src/domain.operations/costReportSpendForecast/getOneCostReportSpendForecast';
export { castIntoDeclaredAwsCostReportSpendObserved } from '@src/domain.operations/costReportSpendObserved/castIntoDeclaredAwsCostReportSpendObserved';
// aws cost report operations
export { getOneCostReportSpendObserved } from '@src/domain.operations/costReportSpendObserved/getOneCostReportSpendObserved';
export { castIntoDeclaredAwsCostReportSpendObservedByResource } from '@src/domain.operations/costReportSpendObservedByResource/castIntoDeclaredAwsCostReportSpendObservedByResource';
export { getOneCostReportSpendObservedByResource } from '@src/domain.operations/costReportSpendObservedByResource/getOneCostReportSpendObservedByResource';
// aws ec2 operations
export { delEc2Instance } from '@src/domain.operations/ec2Instance/delEc2Instance';
export { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
export { setEc2Instance } from '@src/domain.operations/ec2Instance/setEc2Instance';
// aws ec2 instance session operations
export { getEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/getEc2InstanceSession';
export { setEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/setEc2InstanceSession';
// aws ec2 launch template operations
export { delEc2LaunchTemplate } from '@src/domain.operations/ec2LaunchTemplate/delEc2LaunchTemplate';
export { getEc2LaunchTemplate } from '@src/domain.operations/ec2LaunchTemplate/getEc2LaunchTemplate';
export { setEc2LaunchTemplate } from '@src/domain.operations/ec2LaunchTemplate/setEc2LaunchTemplate';
// aws ec2 ssh key operations
export { getOneEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/getOneEc2SshKeyAuthorized';
export { setEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/setEc2SshKeyAuthorized';
// aws iam instance profile operations
export { getIamInstanceProfile } from '@src/domain.operations/iamInstanceProfile/getIamInstanceProfile';
export { setIamInstanceProfile } from '@src/domain.operations/iamInstanceProfile/setIamInstanceProfile';
// aws iam oidc provider operations
export { delIamOidcProvider } from '@src/domain.operations/iamOidcProvider/delIamOidcProvider';
export { getAllIamOidcProviders } from '@src/domain.operations/iamOidcProvider/getAllIamOidcProviders';
export { getOneIamOidcProvider } from '@src/domain.operations/iamOidcProvider/getOneIamOidcProvider';
export { setIamOidcProvider } from '@src/domain.operations/iamOidcProvider/setIamOidcProvider';
export { getOneIamPolicy } from '@src/domain.operations/iamPolicy/getOneIamPolicy';
// aws iam role operations
export { getIamRole } from '@src/domain.operations/iamRole/getIamRole';
export { setIamRole } from '@src/domain.operations/iamRole/setIamRole';
// aws iam role policy attached inline operations
export { delIamRolePolicyAttachedInline } from '@src/domain.operations/iamRolePolicyAttachedInline/delIamRolePolicyAttachedInline';
export { getIamRolePolicyAttachedInline } from '@src/domain.operations/iamRolePolicyAttachedInline/getIamRolePolicyAttachedInline';
export { setIamRolePolicyAttachedInline } from '@src/domain.operations/iamRolePolicyAttachedInline/setIamRolePolicyAttachedInline';
// aws iam role policy attached managed operations
export { delIamRolePolicyAttachedManaged } from '@src/domain.operations/iamRolePolicyAttachedManaged/delIamRolePolicyAttachedManaged';
export { getIamRolePolicyAttachedManaged } from '@src/domain.operations/iamRolePolicyAttachedManaged/getIamRolePolicyAttachedManaged';
export { setIamRolePolicyAttachedManaged } from '@src/domain.operations/iamRolePolicyAttachedManaged/setIamRolePolicyAttachedManaged';
// aws iam user operations
export { getAllIamUsers } from '@src/domain.operations/iamUser/getAllIamUsers';
export { getOneIamUser } from '@src/domain.operations/iamUser/getOneIamUser';
// aws iam user access key operations
export { delIamUserAccessKey } from '@src/domain.operations/iamUserAccessKey/delIamUserAccessKey';
export { getAllIamUserAccessKeys } from '@src/domain.operations/iamUserAccessKey/getAllIamUserAccessKeys';
export { getOneIamUserAccessKey } from '@src/domain.operations/iamUserAccessKey/getOneIamUserAccessKey';
export { genDeclaredAwsLambdaCode } from '@src/domain.operations/lambda/genDeclaredAwsLambdaCode';
export { getAllLambdas } from '@src/domain.operations/lambda/getAllLambdas';
// aws lambda operations
export { getOneLambda } from '@src/domain.operations/lambda/getOneLambda';
export { setLambda } from '@src/domain.operations/lambda/setLambda';
export { calcAwsLambdaCodeHash } from '@src/domain.operations/lambda/utils/calcAwsLambdaCodeHash';
export { delLambdaAlias } from '@src/domain.operations/lambdaAlias/delLambdaAlias';
export { getAllLambdaAliases } from '@src/domain.operations/lambdaAlias/getAllLambdaAliases';
// aws lambda alias operations
export { getOneLambdaAlias } from '@src/domain.operations/lambdaAlias/getOneLambdaAlias';
export { setLambdaAlias } from '@src/domain.operations/lambdaAlias/setLambdaAlias';
export { delLambdaVersion } from '@src/domain.operations/lambdaVersion/delLambdaVersion';
export { getAllLambdaVersions } from '@src/domain.operations/lambdaVersion/getAllLambdaVersions';
// aws lambda version operations
export { getOneLambdaVersion } from '@src/domain.operations/lambdaVersion/getOneLambdaVersion';
export { setLambdaVersion } from '@src/domain.operations/lambdaVersion/setLambdaVersion';
export { calcAwsLambdaConfigHash } from '@src/domain.operations/lambdaVersion/utils/calcAwsLambdaConfigHash';
// aws organization operations
export { delOrganization } from '@src/domain.operations/organization/delOrganization';
export { getOneOrganization } from '@src/domain.operations/organization/getOneOrganization';
export { getOrganizationRootId } from '@src/domain.operations/organization/getOrganizationRootId';
export { setOrganization } from '@src/domain.operations/organization/setOrganization';
// aws organization account operations
export { delOrganizationAccount } from '@src/domain.operations/organizationAccount/delOrganizationAccount';
export { getAllOrganizationAccounts } from '@src/domain.operations/organizationAccount/getAllOrganizationAccounts';
export { getOneOrganizationAccount } from '@src/domain.operations/organizationAccount/getOneOrganizationAccount';
export { setOrganizationAccount } from '@src/domain.operations/organizationAccount/setOrganizationAccount';
// aws organization service control policy operations
export { delOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/delOrganizationServiceControlPolicy';
export { getAllOrganizationServiceControlPolicies } from '@src/domain.operations/organizationServiceControlPolicy/getAllOrganizationServiceControlPolicies';
export { getOneOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';
export { setOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/setOrganizationServiceControlPolicy';
// aws organization service control policy attachment operations
export { delOrganizationServiceControlPolicyAttachment } from '@src/domain.operations/organizationServiceControlPolicyAttachment/delOrganizationServiceControlPolicyAttachment';
export { getAllOrganizationServiceControlPolicyAttachments } from '@src/domain.operations/organizationServiceControlPolicyAttachment/getAllOrganizationServiceControlPolicyAttachments';
export { getOneOrganizationServiceControlPolicyAttachment } from '@src/domain.operations/organizationServiceControlPolicyAttachment/getOneOrganizationServiceControlPolicyAttachment';
export { setOrganizationServiceControlPolicyAttachment } from '@src/domain.operations/organizationServiceControlPolicyAttachment/setOrganizationServiceControlPolicyAttachment';
// aws provider
export { getDeclastructAwsProvider } from '@src/domain.operations/provider/getDeclastructAwsProvider';
// aws rds operations
export { getRdsCluster } from '@src/domain.operations/rdsCluster/getRdsCluster';
// aws ssm command operations
export { execSsmCommand } from '@src/domain.operations/ssmCommand/execSsmCommand';
// aws ssm parameter (plain) operations
export { getOneSsmParameterPlain } from '@src/domain.operations/ssmParameterPlain/getOneSsmParameterPlain';
export { setSsmParameterPlain } from '@src/domain.operations/ssmParameterPlain/setSsmParameterPlain';
// aws ssm parameter (secure) operations
export { delSsmParameterSecure } from '@src/domain.operations/ssmParameterSecure/delSsmParameterSecure';
export { getOneSsmParameterSecure } from '@src/domain.operations/ssmParameterSecure/getOneSsmParameterSecure';
export { setSsmParameterSecure } from '@src/domain.operations/ssmParameterSecure/setSsmParameterSecure';
// aws ssm ssh tunnel operations
export { getOneSsmSshTunnel } from '@src/domain.operations/ssmSshTunnel/getOneSsmSshTunnel';
export { setSsmSshTunnel } from '@src/domain.operations/ssmSshTunnel/setSsmSshTunnel';
// aws ssm vpc tunnel operations
// aws ssm vpc tunnel backwards compat aliases (deprecated, will remove in next major)
/** @deprecated use getOneSsmVpcTunnel */
export {
  getOneSsmVpcTunnel,
  getOneSsmVpcTunnel as getVpcTunnel,
} from '@src/domain.operations/ssmVpcTunnel/getOneSsmVpcTunnel';
/** @deprecated use setSsmVpcTunnel */
export {
  setSsmVpcTunnel,
  setSsmVpcTunnel as setVpcTunnel,
} from '@src/domain.operations/ssmVpcTunnel/setSsmVpcTunnel';
// aws sso account assignment operations
export { delSsoAccountAssignment } from '@src/domain.operations/ssoAccountAssignment/delSsoAccountAssignment';
export { getAllSsoAccountAssignments } from '@src/domain.operations/ssoAccountAssignment/getAllSsoAccountAssignments';
export { getOneSsoAccountAssignment } from '@src/domain.operations/ssoAccountAssignment/getOneSsoAccountAssignment';
export { setSsoAccountAssignment } from '@src/domain.operations/ssoAccountAssignment/setSsoAccountAssignment';
// aws sso instance operations
export { getOneSsoInstance } from '@src/domain.operations/ssoInstance/getOneSsoInstance';
export { setSsoInstance } from '@src/domain.operations/ssoInstance/setSsoInstance';
// aws sso permission set operations
export { delSsoPermissionSet } from '@src/domain.operations/ssoPermissionSet/delSsoPermissionSet';
export { getAllSsoPermissionSets } from '@src/domain.operations/ssoPermissionSet/getAllSsoPermissionSets';
export { getOneSsoPermissionSet } from '@src/domain.operations/ssoPermissionSet/getOneSsoPermissionSet';
export { setSsoPermissionSet } from '@src/domain.operations/ssoPermissionSet/setSsoPermissionSet';
// aws sso user operations
export { delSsoUser } from '@src/domain.operations/ssoUser/delSsoUser';
export { getAllSsoUsers } from '@src/domain.operations/ssoUser/getAllSsoUsers';
export { getOneSsoUser } from '@src/domain.operations/ssoUser/getOneSsoUser';
export { setSsoUser } from '@src/domain.operations/ssoUser/setSsoUser';
// aws vpc operations
export { delVpc } from '@src/domain.operations/vpc/delVpc';
export { getOneVpc } from '@src/domain.operations/vpc/getOneVpc';
export { setVpc } from '@src/domain.operations/vpc/setVpc';
// aws vpc internet gateway operations
export { delVpcInternetGateway } from '@src/domain.operations/vpcInternetGateway/delVpcInternetGateway';
export { getOneVpcInternetGateway } from '@src/domain.operations/vpcInternetGateway/getOneVpcInternetGateway';
export { setVpcInternetGateway } from '@src/domain.operations/vpcInternetGateway/setVpcInternetGateway';
// aws vpc route table operations
export { delVpcRouteTable } from '@src/domain.operations/vpcRouteTable/delVpcRouteTable';
export { getOneVpcRouteTable } from '@src/domain.operations/vpcRouteTable/getOneVpcRouteTable';
export { setVpcRouteTable } from '@src/domain.operations/vpcRouteTable/setVpcRouteTable';
// aws vpc security group operations
export { delVpcSecurityGroup } from '@src/domain.operations/vpcSecurityGroup/delVpcSecurityGroup';
export { getOneVpcSecurityGroup } from '@src/domain.operations/vpcSecurityGroup/getOneVpcSecurityGroup';
export { setVpcSecurityGroup } from '@src/domain.operations/vpcSecurityGroup/setVpcSecurityGroup';
// aws vpc subnet operations
export { delVpcSubnet } from '@src/domain.operations/vpcSubnet/delVpcSubnet';
export { getOneVpcSubnet } from '@src/domain.operations/vpcSubnet/getOneVpcSubnet';
export { setVpcSubnet } from '@src/domain.operations/vpcSubnet/setVpcSubnet';
