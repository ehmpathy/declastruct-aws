/**
 * .what = public SDK exports for declastruct-aws package
 * .why = enables consumers to use the declastruct provider interface and domain objects
 */

// aws daos
export { DeclaredAwsEc2InstanceDao } from '../../access/daos/DeclaredAwsEc2InstanceDao';
export { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
export { DeclaredAwsIamRolePolicyDao } from '../../access/daos/DeclaredAwsIamRolePolicyDao';
export { DeclaredAwsLambdaAliasDao } from '../../access/daos/DeclaredAwsLambdaAliasDao';
export { DeclaredAwsLambdaDao } from '../../access/daos/DeclaredAwsLambdaDao';
export { DeclaredAwsLambdaVersionDao } from '../../access/daos/DeclaredAwsLambdaVersionDao';
export { DeclaredAwsLogGroupDao } from '../../access/daos/DeclaredAwsLogGroupDao';
export { DeclaredAwsLogGroupReportCostOfIngestionDao } from '../../access/daos/DeclaredAwsLogGroupReportCostOfIngestionDao';
export { DeclaredAwsLogGroupReportDistOfPatternDao } from '../../access/daos/DeclaredAwsLogGroupReportDistOfPatternDao';
export { DeclaredAwsRdsClusterDao } from '../../access/daos/DeclaredAwsRdsClusterDao';
export { DeclaredAwsVpcTunnelDao } from '../../access/daos/DeclaredAwsVpcTunnelDao';
// aws domain objects
export { DeclaredAwsEc2Instance } from '../../domain.objects/DeclaredAwsEc2Instance';
export { DeclaredAwsIamPolicyDocument } from '../../domain.objects/DeclaredAwsIamPolicyDocument';
export {
  DeclaredAwsIamPolicyStatement,
  DeclaredAwsIamPrincipal,
} from '../../domain.objects/DeclaredAwsIamPolicyStatement';
export { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
export { DeclaredAwsIamRolePolicy } from '../../domain.objects/DeclaredAwsIamRolePolicy';
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
export { DeclaredAwsRdsCluster } from '../../domain.objects/DeclaredAwsRdsCluster';
export { DeclaredAwsVpcTunnel } from '../../domain.objects/DeclaredAwsVpcTunnel';
export type { DeclastructAwsProvider } from '../../domain.objects/DeclastructAwsProvider';
// aws ec2 operations
export { getEc2Instance } from '../../domain.operations/ec2Instance/getEc2Instance';
export { setEc2InstanceStatus } from '../../domain.operations/ec2Instance/setEc2InstanceStatus';
// aws iam role operations
export { getIamRole } from '../../domain.operations/iamRole/getIamRole';
export { setIamRole } from '../../domain.operations/iamRole/setIamRole';
export { getIamRolePolicy } from '../../domain.operations/iamRolePolicy/getIamRolePolicy';
export { setIamRolePolicy } from '../../domain.operations/iamRolePolicy/setIamRolePolicy';
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
// aws provider
export { getDeclastructAwsProvider } from '../../domain.operations/provider/getDeclastructAwsProvider';
// aws rds operations
export { getRdsCluster } from '../../domain.operations/rdsCluster/getRdsCluster';
// aws vpc tunnel operations
export { getVpcTunnel } from '../../domain.operations/vpcTunnel/getVpcTunnel';
export { setVpcTunnel } from '../../domain.operations/vpcTunnel/setVpcTunnel';
