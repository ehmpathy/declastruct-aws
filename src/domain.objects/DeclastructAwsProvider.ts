import { DeclastructDao, DeclastructProvider } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextAwsApi } from './ContextAwsApi';
import { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';
import { DeclaredAwsLogGroup } from './DeclaredAwsLogGroup';
import { DeclaredAwsLogGroupReportCostOfIngestion } from './DeclaredAwsLogGroupReportCostOfIngestion';
import { DeclaredAwsLogGroupReportDistOfPattern } from './DeclaredAwsLogGroupReportDistOfPattern';
import { DeclaredAwsRdsCluster } from './DeclaredAwsRdsCluster';
import { DeclaredAwsVpcTunnel } from './DeclaredAwsVpcTunnel';

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
