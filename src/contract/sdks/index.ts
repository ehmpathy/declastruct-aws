/**
 * .what = public SDK exports for declastruct-aws package
 * .why = enables consumers to use the declastruct provider interface and domain objects
 */

// aws provider
export { getDeclastructAwsProvider } from '../../domain.operations/provider/getDeclastructAwsProvider';
export type { DeclastructAwsProvider } from '../../domain.objects/DeclastructAwsProvider';

// aws domain objects
export { DeclaredAwsEc2Instance } from '../../domain.objects/DeclaredAwsEc2Instance';
export { DeclaredAwsRdsCluster } from '../../domain.objects/DeclaredAwsRdsCluster';
export { DeclaredAwsVpcTunnel } from '../../domain.objects/DeclaredAwsVpcTunnel';
export { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
export {
  DeclaredAwsIamPrincipal,
  DeclaredAwsIamPolicyStatement,
} from '../../domain.objects/DeclaredAwsIamPolicyStatement';
export { DeclaredAwsIamPolicyDocument } from '../../domain.objects/DeclaredAwsIamPolicyDocument';
export { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
export { DeclaredAwsIamRolePolicy } from '../../domain.objects/DeclaredAwsIamRolePolicy';
export { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
export { DeclaredAwsLambdaAlias } from '../../domain.objects/DeclaredAwsLambdaAlias';

// aws ec2 operations
export { getEc2Instance } from '../../domain.operations/ec2Instance/getEc2Instance';
export { setEc2InstanceStatus } from '../../domain.operations/ec2Instance/setEc2InstanceStatus';

// aws rds operations
export { getRdsCluster } from '../../domain.operations/rdsCluster/getRdsCluster';

// aws vpc tunnel operations
export { getVpcTunnel } from '../../domain.operations/vpcTunnel/getVpcTunnel';
export { setVpcTunnel } from '../../domain.operations/vpcTunnel/setVpcTunnel';

// aws iam role operations
export { getIamRole } from '../../domain.operations/iamRole/getIamRole';
export { setIamRole } from '../../domain.operations/iamRole/setIamRole';
export { getIamRolePolicy } from '../../domain.operations/iamRolePolicy/getIamRolePolicy';
export { setIamRolePolicy } from '../../domain.operations/iamRolePolicy/setIamRolePolicy';

// aws lambda operations
export { getOneLambda } from '../../domain.operations/lambda/getOneLambda';
export { getAllLambdas } from '../../domain.operations/lambda/getAllLambdas';
export { setLambda } from '../../domain.operations/lambda/setLambda';

// aws lambda version operations
export { getOneLambdaVersion } from '../../domain.operations/lambdaVersion/getOneLambdaVersion';
export { getAllLambdaVersions } from '../../domain.operations/lambdaVersion/getAllLambdaVersions';
export { setLambdaVersion } from '../../domain.operations/lambdaVersion/setLambdaVersion';
export { delLambdaVersion } from '../../domain.operations/lambdaVersion/delLambdaVersion';
export { calcCodeSha256 } from '../../domain.operations/lambda/utils/calcCodeSha256';
export { calcConfigSha256 } from '../../domain.operations/lambdaVersion/utils/calcConfigSha256';

// aws lambda alias operations
export { getOneLambdaAlias } from '../../domain.operations/lambdaAlias/getOneLambdaAlias';
export { getAllLambdaAliases } from '../../domain.operations/lambdaAlias/getAllLambdaAliases';
export { setLambdaAlias } from '../../domain.operations/lambdaAlias/setLambdaAlias';
export { delLambdaAlias } from '../../domain.operations/lambdaAlias/delLambdaAlias';

// aws log group domain objects
export { DeclaredAwsLogGroup } from '../../domain.objects/DeclaredAwsLogGroup';
export {
  DeclaredAwsLogGroupReportDistOfPattern,
  DeclaredAwsLogGroupReportDistOfPatternRow,
} from '../../domain.objects/DeclaredAwsLogGroupReportDistOfPattern';
export {
  DeclaredAwsLogGroupReportCostOfIngestion,
  DeclaredAwsLogGroupReportCostOfIngestionRow,
  type DeclaredAwsLogGroupFilter,
} from '../../domain.objects/DeclaredAwsLogGroupReportCostOfIngestion';

// aws log group operations
export { getOneLogGroup } from '../../domain.operations/logGroup/getOneLogGroup';
export { getAllLogGroups } from '../../domain.operations/logGroup/getAllLogGroups';
export { getOneLogGroupReportDistOfPattern } from '../../domain.operations/logGroupReportDistOfPattern/getOneLogGroupReportDistOfPattern';
export { getOneLogGroupReportCostOfIngestion } from '../../domain.operations/logGroupReportCostOfIngestion/getOneLogGroupReportCostOfIngestion';

// aws daos
export { DeclaredAwsEc2InstanceDao } from '../../access/daos/DeclaredAwsEc2InstanceDao';
export { DeclaredAwsIamRoleDao } from '../../access/daos/DeclaredAwsIamRoleDao';
export { DeclaredAwsIamRolePolicyDao } from '../../access/daos/DeclaredAwsIamRolePolicyDao';
export { DeclaredAwsLambdaDao } from '../../access/daos/DeclaredAwsLambdaDao';
export { DeclaredAwsLambdaAliasDao } from '../../access/daos/DeclaredAwsLambdaAliasDao';
export { DeclaredAwsLambdaVersionDao } from '../../access/daos/DeclaredAwsLambdaVersionDao';
export { DeclaredAwsRdsClusterDao } from '../../access/daos/DeclaredAwsRdsClusterDao';
export { DeclaredAwsVpcTunnelDao } from '../../access/daos/DeclaredAwsVpcTunnelDao';
export { DeclaredAwsLogGroupDao } from '../../access/daos/DeclaredAwsLogGroupDao';
export { DeclaredAwsLogGroupReportDistOfPatternDao } from '../../access/daos/DeclaredAwsLogGroupReportDistOfPatternDao';
export { DeclaredAwsLogGroupReportCostOfIngestionDao } from '../../access/daos/DeclaredAwsLogGroupReportCostOfIngestionDao';
