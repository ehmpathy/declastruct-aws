/**
 * .what = public SDK exports for declastruct-aws package
 * .why = enables consumers to use the declastruct provider interface and domain objects
 */

// aws daos
export { DeclaredAwsEc2InstanceDao } from '../../access/daos/DeclaredAwsEc2InstanceDao';
// aws iam oidc provider dao
export { DeclaredAwsIamOidcProviderDao } from '../../access/daos/DeclaredAwsIamOidcProviderDao';
export { DeclaredAwsIamPolicyDao } from '../../access/daos/DeclaredAwsIamPolicyDao';
export { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
export { DeclaredAwsIamRolePolicyAttachedInlineDao } from '../../access/daos/DeclaredAwsIamRolePolicyAttachedInlineDao';
export { DeclaredAwsIamRolePolicyAttachedManagedDao } from '../../access/daos/DeclaredAwsIamRolePolicyAttachedManagedDao';
export { DeclaredAwsLambdaAliasDao } from '../../access/daos/DeclaredAwsLambdaAliasDao';
export { DeclaredAwsLambdaDao } from '../../access/daos/DeclaredAwsLambdaDao';
export { DeclaredAwsLambdaVersionDao } from '../../access/daos/DeclaredAwsLambdaVersionDao';
export { DeclaredAwsLogGroupDao } from '../../access/daos/DeclaredAwsLogGroupDao';
export { DeclaredAwsLogGroupReportCostOfIngestionDao } from '../../access/daos/DeclaredAwsLogGroupReportCostOfIngestionDao';
export { DeclaredAwsLogGroupReportDistOfPatternDao } from '../../access/daos/DeclaredAwsLogGroupReportDistOfPatternDao';
export { DeclaredAwsOrganizationAccountDao } from '../../access/daos/DeclaredAwsOrganizationAccountDao';
export { DeclaredAwsOrganizationDao } from '../../access/daos/DeclaredAwsOrganizationDao';
export { DeclaredAwsRdsClusterDao } from '../../access/daos/DeclaredAwsRdsClusterDao';
// aws sso daos
export { DeclaredAwsSsoAccountAssignmentDao } from '../../access/daos/DeclaredAwsSsoAccountAssignmentDao';
export { DeclaredAwsSsoInstanceDao } from '../../access/daos/DeclaredAwsSsoInstanceDao';
export { DeclaredAwsSsoPermissionSetDao } from '../../access/daos/DeclaredAwsSsoPermissionSetDao';
// note: DeclaredAwsSsoInstance does not have its own DAO - use getOneSsoInstance/setSsoInstance directly
export { DeclaredAwsSsoUserDao } from '../../access/daos/DeclaredAwsSsoUserDao';
export { DeclaredAwsVpcTunnelDao } from '../../access/daos/DeclaredAwsVpcTunnelDao';
// aws domain objects
export { DeclaredAwsEc2Instance } from '../../domain.objects/DeclaredAwsEc2Instance';
// aws iam oidc provider domain objects
export { DeclaredAwsIamOidcProvider } from '../../domain.objects/DeclaredAwsIamOidcProvider';
export { DeclaredAwsIamPolicy } from '../../domain.objects/DeclaredAwsIamPolicy';
export { DeclaredAwsIamPolicyBundle } from '../../domain.objects/DeclaredAwsIamPolicyBundle';
export { DeclaredAwsIamPolicyDocument } from '../../domain.objects/DeclaredAwsIamPolicyDocument';
export {
  DeclaredAwsIamPolicyStatement,
  DeclaredAwsIamPrincipal,
} from '../../domain.objects/DeclaredAwsIamPolicyStatement';
export { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
export { DeclaredAwsIamRolePolicyAttachedInline } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedInline';
export { DeclaredAwsIamRolePolicyAttachedManaged } from '../../domain.objects/DeclaredAwsIamRolePolicyAttachedManaged';
export { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
export { DeclaredAwsLambdaAlias } from '../../domain.objects/DeclaredAwsLambdaAlias';
export { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
// aws log group domain objects
export { DeclaredAwsLogGroup } from '../../domain.objects/DeclaredAwsLogGroup';
export {
  type DeclaredAwsLogGroupFilter,
  DeclaredAwsLogGroupReportCostOfIngestion,
  DeclaredAwsLogGroupReportCostOfIngestionRow,
} from '../../domain.objects/DeclaredAwsLogGroupReportCostOfIngestion';
export {
  DeclaredAwsLogGroupReportDistOfPattern,
  DeclaredAwsLogGroupReportDistOfPatternRow,
} from '../../domain.objects/DeclaredAwsLogGroupReportDistOfPattern';
// aws organization + organization account domain objects
export { DeclaredAwsOrganization } from '../../domain.objects/DeclaredAwsOrganization';
export { DeclaredAwsOrganizationAccount } from '../../domain.objects/DeclaredAwsOrganizationAccount';
export { DeclaredAwsRdsCluster } from '../../domain.objects/DeclaredAwsRdsCluster';
// aws sso domain objects
export { DeclaredAwsSsoAccountAssignment } from '../../domain.objects/DeclaredAwsSsoAccountAssignment';
export { DeclaredAwsSsoInstance } from '../../domain.objects/DeclaredAwsSsoInstance';
export { DeclaredAwsSsoPermissionSet } from '../../domain.objects/DeclaredAwsSsoPermissionSet';
export { DeclaredAwsSsoUser } from '../../domain.objects/DeclaredAwsSsoUser';
export { DeclaredAwsVpcTunnel } from '../../domain.objects/DeclaredAwsVpcTunnel';
export type { DeclastructAwsProvider } from '../../domain.objects/DeclastructAwsProvider';
// aws ec2 operations
export { getEc2Instance } from '../../domain.operations/ec2Instance/getEc2Instance';
export { setEc2InstanceStatus } from '../../domain.operations/ec2Instance/setEc2InstanceStatus';
// aws iam oidc provider operations
export { delIamOidcProvider } from '../../domain.operations/iamOidcProvider/delIamOidcProvider';
export { getAllIamOidcProviders } from '../../domain.operations/iamOidcProvider/getAllIamOidcProviders';
export { getOneIamOidcProvider } from '../../domain.operations/iamOidcProvider/getOneIamOidcProvider';
export { setIamOidcProvider } from '../../domain.operations/iamOidcProvider/setIamOidcProvider';
export { getOneIamPolicy } from '../../domain.operations/iamPolicy/getOneIamPolicy';
// aws iam role operations
export { getIamRole } from '../../domain.operations/iamRole/getIamRole';
export { setIamRole } from '../../domain.operations/iamRole/setIamRole';
// aws iam role policy attached inline operations
export { delIamRolePolicyAttachedInline } from '../../domain.operations/iamRolePolicyAttachedInline/delIamRolePolicyAttachedInline';
export { getIamRolePolicyAttachedInline } from '../../domain.operations/iamRolePolicyAttachedInline/getIamRolePolicyAttachedInline';
export { setIamRolePolicyAttachedInline } from '../../domain.operations/iamRolePolicyAttachedInline/setIamRolePolicyAttachedInline';
// aws iam role policy attached managed operations
export { delIamRolePolicyAttachedManaged } from '../../domain.operations/iamRolePolicyAttachedManaged/delIamRolePolicyAttachedManaged';
export { getIamRolePolicyAttachedManaged } from '../../domain.operations/iamRolePolicyAttachedManaged/getIamRolePolicyAttachedManaged';
export { setIamRolePolicyAttachedManaged } from '../../domain.operations/iamRolePolicyAttachedManaged/setIamRolePolicyAttachedManaged';
export { getAllLambdas } from '../../domain.operations/lambda/getAllLambdas';
// aws lambda operations
export { getOneLambda } from '../../domain.operations/lambda/getOneLambda';
export { setLambda } from '../../domain.operations/lambda/setLambda';
export { calcCodeSha256 } from '../../domain.operations/lambda/utils/calcCodeSha256';
export { delLambdaAlias } from '../../domain.operations/lambdaAlias/delLambdaAlias';
export { getAllLambdaAliases } from '../../domain.operations/lambdaAlias/getAllLambdaAliases';
// aws lambda alias operations
export { getOneLambdaAlias } from '../../domain.operations/lambdaAlias/getOneLambdaAlias';
export { setLambdaAlias } from '../../domain.operations/lambdaAlias/setLambdaAlias';
export { delLambdaVersion } from '../../domain.operations/lambdaVersion/delLambdaVersion';
export { getAllLambdaVersions } from '../../domain.operations/lambdaVersion/getAllLambdaVersions';
// aws lambda version operations
export { getOneLambdaVersion } from '../../domain.operations/lambdaVersion/getOneLambdaVersion';
export { setLambdaVersion } from '../../domain.operations/lambdaVersion/setLambdaVersion';
export { calcConfigSha256 } from '../../domain.operations/lambdaVersion/utils/calcConfigSha256';
// aws log group operations
export { getAllLogGroups } from '../../domain.operations/logGroup/getAllLogGroups';
export { getOneLogGroup } from '../../domain.operations/logGroup/getOneLogGroup';
export { setLogGroup } from '../../domain.operations/logGroup/setLogGroup';
export { getOneLogGroupReportCostOfIngestion } from '../../domain.operations/logGroupReportCostOfIngestion/getOneLogGroupReportCostOfIngestion';
export { getOneLogGroupReportDistOfPattern } from '../../domain.operations/logGroupReportDistOfPattern/getOneLogGroupReportDistOfPattern';
// aws organization operations
export { delOrganization } from '../../domain.operations/organization/delOrganization';
export { getOneOrganization } from '../../domain.operations/organization/getOneOrganization';
export { setOrganization } from '../../domain.operations/organization/setOrganization';
// aws organization account operations
export { delOrganizationAccount } from '../../domain.operations/organizationAccount/delOrganizationAccount';
export { getAllOrganizationAccounts } from '../../domain.operations/organizationAccount/getAllOrganizationAccounts';
export { getOneOrganizationAccount } from '../../domain.operations/organizationAccount/getOneOrganizationAccount';
export { setOrganizationAccount } from '../../domain.operations/organizationAccount/setOrganizationAccount';
// aws provider
export { getDeclastructAwsProvider } from '../../domain.operations/provider/getDeclastructAwsProvider';
// aws rds operations
export { getRdsCluster } from '../../domain.operations/rdsCluster/getRdsCluster';
// aws sso account assignment operations
export { delSsoAccountAssignment } from '../../domain.operations/ssoAccountAssignment/delSsoAccountAssignment';
export { getAllSsoAccountAssignments } from '../../domain.operations/ssoAccountAssignment/getAllSsoAccountAssignments';
export { getOneSsoAccountAssignment } from '../../domain.operations/ssoAccountAssignment/getOneSsoAccountAssignment';
export { setSsoAccountAssignment } from '../../domain.operations/ssoAccountAssignment/setSsoAccountAssignment';
// aws sso instance operations
export { getOneSsoInstance } from '../../domain.operations/ssoInstance/getOneSsoInstance';
export { setSsoInstance } from '../../domain.operations/ssoInstance/setSsoInstance';
// aws sso permission set operations
export { delSsoPermissionSet } from '../../domain.operations/ssoPermissionSet/delSsoPermissionSet';
export { getAllSsoPermissionSets } from '../../domain.operations/ssoPermissionSet/getAllSsoPermissionSets';
export { getOneSsoPermissionSet } from '../../domain.operations/ssoPermissionSet/getOneSsoPermissionSet';
export { setSsoPermissionSet } from '../../domain.operations/ssoPermissionSet/setSsoPermissionSet';
// aws sso user operations
export { delSsoUser } from '../../domain.operations/ssoUser/delSsoUser';
export { getAllSsoUsers } from '../../domain.operations/ssoUser/getAllSsoUsers';
export { getOneSsoUser } from '../../domain.operations/ssoUser/getOneSsoUser';
export { setSsoUser } from '../../domain.operations/ssoUser/setSsoUser';
// aws vpc tunnel operations
export { getVpcTunnel } from '../../domain.operations/vpcTunnel/getVpcTunnel';
export { setVpcTunnel } from '../../domain.operations/vpcTunnel/setVpcTunnel';
