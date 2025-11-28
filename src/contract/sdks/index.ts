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

// aws ec2 operations
export { getEc2Instance } from '../../domain.operations/ec2Instance/getEc2Instance';
export { setEc2InstanceStatus } from '../../domain.operations/ec2Instance/setEc2InstanceStatus';

// aws rds operations
export { getRdsCluster } from '../../domain.operations/rdsCluster/getRdsCluster';

// aws vpc tunnel operations
export { getVpcTunnel } from '../../domain.operations/vpcTunnel/getVpcTunnel';
export { setVpcTunnel } from '../../domain.operations/vpcTunnel/setVpcTunnel';
