import type { DeclastructDao, DeclastructProvider } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from './ContextAwsApi';
import type { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';
import type { DeclaredAwsLogGroup } from './DeclaredAwsLogGroup';
import type { DeclaredAwsLogGroupReportCostOfIngestion } from './DeclaredAwsLogGroupReportCostOfIngestion';
import type { DeclaredAwsLogGroupReportDistOfPattern } from './DeclaredAwsLogGroupReportDistOfPattern';
import type { DeclaredAwsRdsCluster } from './DeclaredAwsRdsCluster';
import type { DeclaredAwsVpcTunnel } from './DeclaredAwsVpcTunnel';

/**
 * .what = the declastruct provider for aws resources
 * .why = provides type safety and reusability for the aws provider
 */
export type DeclastructAwsProvider = DeclastructProvider<
  {
    DeclaredAwsEc2Instance: DeclastructDao<
      DeclaredAwsEc2Instance,
      typeof DeclaredAwsEc2Instance,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsRdsCluster: DeclastructDao<
      DeclaredAwsRdsCluster,
      typeof DeclaredAwsRdsCluster,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsVpcTunnel: DeclastructDao<
      DeclaredAwsVpcTunnel,
      typeof DeclaredAwsVpcTunnel,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsLogGroup: DeclastructDao<
      DeclaredAwsLogGroup,
      typeof DeclaredAwsLogGroup,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsLogGroupReportDistOfPattern: DeclastructDao<
      DeclaredAwsLogGroupReportDistOfPattern,
      typeof DeclaredAwsLogGroupReportDistOfPattern,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsLogGroupReportCostOfIngestion: DeclastructDao<
      DeclaredAwsLogGroupReportCostOfIngestion,
      typeof DeclaredAwsLogGroupReportCostOfIngestion,
      ContextAwsApi & ContextLogTrail
    >;
  },
  ContextAwsApi & ContextLogTrail
>;
