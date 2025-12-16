/**
 * .what = public SDK exports for declastruct-aws package
 * .why = enables consumers to use the declastruct provider interface and domain objects
 */

// aws daos
export { DeclaredAwsEc2InstanceDao } from '@src/access/daos/DeclaredAwsEc2InstanceDao';
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
export { DeclaredAwsRdsClusterDao } from '@src/access/daos/DeclaredAwsRdsClusterDao';
// aws sso daos
export { DeclaredAwsSsoAccountAssignmentDao } from '@src/access/daos/DeclaredAwsSsoAccountAssignmentDao';
export { DeclaredAwsSsoInstanceDao } from '@src/access/daos/DeclaredAwsSsoInstanceDao';
export { DeclaredAwsSsoPermissionSetDao } from '@src/access/daos/DeclaredAwsSsoPermissionSetDao';
// note: DeclaredAwsSsoInstance does not have its own DAO - use getOneSsoInstance/setSsoInstance directly
export { DeclaredAwsSsoUserDao } from '@src/access/daos/DeclaredAwsSsoUserDao';
export { DeclaredAwsVpcTunnelDao } from '@src/access/daos/DeclaredAwsVpcTunnelDao';
// aws domain objects
export { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
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
export { DeclaredAwsLambdaVersion } from '@src/domain.objects/DeclaredAwsLambdaVersion';
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
export { DeclaredAwsRdsCluster } from '@src/domain.objects/DeclaredAwsRdsCluster';
// aws sso domain objects
export { DeclaredAwsSsoAccountAssignment } from '@src/domain.objects/DeclaredAwsSsoAccountAssignment';
export { DeclaredAwsSsoInstance } from '@src/domain.objects/DeclaredAwsSsoInstance';
export { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';
export { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';
export { DeclaredAwsVpcTunnel } from '@src/domain.objects/DeclaredAwsVpcTunnel';
export type { DeclastructAwsProvider } from '@src/domain.objects/DeclastructAwsProvider';
// aws ec2 operations
export { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
export { setEc2InstanceStatus } from '@src/domain.operations/ec2Instance/setEc2InstanceStatus';
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
export { getAllLambdas } from '@src/domain.operations/lambda/getAllLambdas';
// aws lambda operations
export { getOneLambda } from '@src/domain.operations/lambda/getOneLambda';
export { setLambda } from '@src/domain.operations/lambda/setLambda';
export { calcCodeSha256 } from '@src/domain.operations/lambda/utils/calcCodeSha256';
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
export { calcConfigSha256 } from '@src/domain.operations/lambdaVersion/utils/calcConfigSha256';
// aws log group operations
export { getAllLogGroups } from '@src/domain.operations/logGroup/getAllLogGroups';
export { getOneLogGroup } from '@src/domain.operations/logGroup/getOneLogGroup';
export { setLogGroup } from '@src/domain.operations/logGroup/setLogGroup';
export { getOneLogGroupReportCostOfIngestion } from '@src/domain.operations/logGroupReportCostOfIngestion/getOneLogGroupReportCostOfIngestion';
export { getOneLogGroupReportDistOfPattern } from '@src/domain.operations/logGroupReportDistOfPattern/getOneLogGroupReportDistOfPattern';
// aws organization operations
export { delOrganization } from '@src/domain.operations/organization/delOrganization';
export { getOneOrganization } from '@src/domain.operations/organization/getOneOrganization';
export { setOrganization } from '@src/domain.operations/organization/setOrganization';
// aws organization account operations
export { delOrganizationAccount } from '@src/domain.operations/organizationAccount/delOrganizationAccount';
export { getAllOrganizationAccounts } from '@src/domain.operations/organizationAccount/getAllOrganizationAccounts';
export { getOneOrganizationAccount } from '@src/domain.operations/organizationAccount/getOneOrganizationAccount';
export { setOrganizationAccount } from '@src/domain.operations/organizationAccount/setOrganizationAccount';
// aws provider
export { getDeclastructAwsProvider } from '@src/domain.operations/provider/getDeclastructAwsProvider';
// aws rds operations
export { getRdsCluster } from '@src/domain.operations/rdsCluster/getRdsCluster';
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
// aws vpc tunnel operations
export { getVpcTunnel } from '@src/domain.operations/vpcTunnel/getVpcTunnel';
export { setVpcTunnel } from '@src/domain.operations/vpcTunnel/setVpcTunnel';
