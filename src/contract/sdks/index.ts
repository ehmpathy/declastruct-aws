/**
 * .what = public SDK exports for declastruct-aws package
 * .why = enables consumers to use the declastruct provider interface and domain objects
 */

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
export { DeclaredAwsLogGroupDao } from '@src/access/daos/DeclaredAwsLogGroupDao';
export { DeclaredAwsLogGroupReportCostOfIngestionDao } from '@src/access/daos/DeclaredAwsLogGroupReportCostOfIngestionDao';
export { DeclaredAwsLogGroupReportDistOfPatternDao } from '@src/access/daos/DeclaredAwsLogGroupReportDistOfPatternDao';
export { DeclaredAwsOrganizationAccountDao } from '@src/access/daos/DeclaredAwsOrganizationAccountDao';
export { DeclaredAwsOrganizationDao } from '@src/access/daos/DeclaredAwsOrganizationDao';
export { DeclaredAwsOrganizationPolicyEligibilityDao } from '@src/access/daos/DeclaredAwsOrganizationPolicyEligibilityDao';
export { DeclaredAwsOrganizationServiceControlPolicyAttachmentDao } from '@src/access/daos/DeclaredAwsOrganizationServiceControlPolicyAttachmentDao';
export { DeclaredAwsOrganizationServiceControlPolicyDao } from '@src/access/daos/DeclaredAwsOrganizationServiceControlPolicyDao';
export { DeclaredAwsRdsClusterDao } from '@src/access/daos/DeclaredAwsRdsClusterDao';
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
export {
  DeclaredAwsIamPolicyStatement,
  DeclaredAwsIamPrincipal,
} from '@src/domain.objects/DeclaredAwsIamPolicyStatement';
export { DeclaredAwsIamRole } from '@src/domain.objects/DeclaredAwsIamRole';
export { DeclaredAwsIamRolePolicyAttachedInline } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedInline';
export { DeclaredAwsIamRolePolicyAttachedManaged } from '@src/domain.objects/DeclaredAwsIamRolePolicyAttachedManaged';
export { DeclaredAwsIamUser } from '@src/domain.objects/DeclaredAwsIamUser';
export { DeclaredAwsIamUserAccessKey } from '@src/domain.objects/DeclaredAwsIamUserAccessKey';
export { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';
export { DeclaredAwsLambdaAlias } from '@src/domain.objects/DeclaredAwsLambdaAlias';
export { DeclaredAwsLambdaCode } from '@src/domain.objects/DeclaredAwsLambdaCode';
export { DeclaredAwsLambdaVersion } from '@src/domain.objects/DeclaredAwsLambdaVersion';
export { DeclaredAwsLambdaVersionHash } from '@src/domain.objects/DeclaredAwsLambdaVersionHash';
// aws log group domain objects
export { DeclaredAwsLogGroup } from '@src/domain.objects/DeclaredAwsLogGroup';
export {
  type DeclaredAwsLogGroupFilter,
  DeclaredAwsLogGroupReportCostOfIngestion,
  DeclaredAwsLogGroupReportCostOfIngestionRow,
} from '@src/domain.objects/DeclaredAwsLogGroupReportCostOfIngestion';
export {
  DeclaredAwsLogGroupReportDistOfPattern,
  DeclaredAwsLogGroupReportDistOfPatternRow,
} from '@src/domain.objects/DeclaredAwsLogGroupReportDistOfPattern';
// aws organization + organization account domain objects
export { DeclaredAwsOrganization } from '@src/domain.objects/DeclaredAwsOrganization';
export { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';
export { DeclaredAwsOrganizationPolicyEligibility } from '@src/domain.objects/DeclaredAwsOrganizationPolicyEligibility';
export { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
export { DeclaredAwsOrganizationServiceControlPolicyAttachment } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicyAttachment';
export { DeclaredAwsRdsCluster } from '@src/domain.objects/DeclaredAwsRdsCluster';
// aws ssm domain objects
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
// aws log group operations
export { getAllLogGroups } from '@src/domain.operations/logGroup/getAllLogGroups';
export { getOneLogGroup } from '@src/domain.operations/logGroup/getOneLogGroup';
export { setLogGroup } from '@src/domain.operations/logGroup/setLogGroup';
export { getOneLogGroupReportCostOfIngestion } from '@src/domain.operations/logGroupReportCostOfIngestion/getOneLogGroupReportCostOfIngestion';
export { getOneLogGroupReportDistOfPattern } from '@src/domain.operations/logGroupReportDistOfPattern/getOneLogGroupReportDistOfPattern';
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
