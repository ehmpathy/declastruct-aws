import type { DeclastructDao, DeclastructProvider } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from './ContextAwsApi';
import type { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';
import type { DeclaredAwsIamOidcProvider } from './DeclaredAwsIamOidcProvider';
import type { DeclaredAwsIamRole } from './DeclaredAwsIamRole';
import type { DeclaredAwsIamRolePolicyAttachedInline } from './DeclaredAwsIamRolePolicyAttachedInline';
import type { DeclaredAwsIamRolePolicyAttachedManaged } from './DeclaredAwsIamRolePolicyAttachedManaged';
import type { DeclaredAwsLambda } from './DeclaredAwsLambda';
import type { DeclaredAwsLambdaAlias } from './DeclaredAwsLambdaAlias';
import type { DeclaredAwsLambdaVersion } from './DeclaredAwsLambdaVersion';
import type { DeclaredAwsLogGroup } from './DeclaredAwsLogGroup';
import type { DeclaredAwsLogGroupReportCostOfIngestion } from './DeclaredAwsLogGroupReportCostOfIngestion';
import type { DeclaredAwsLogGroupReportDistOfPattern } from './DeclaredAwsLogGroupReportDistOfPattern';
import type { DeclaredAwsOrganization } from './DeclaredAwsOrganization';
import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';
import type { DeclaredAwsRdsCluster } from './DeclaredAwsRdsCluster';
import type { DeclaredAwsSsoAccountAssignment } from './DeclaredAwsSsoAccountAssignment';
import type { DeclaredAwsSsoInstance } from './DeclaredAwsSsoInstance';
import type { DeclaredAwsSsoPermissionSet } from './DeclaredAwsSsoPermissionSet';
import type { DeclaredAwsSsoUser } from './DeclaredAwsSsoUser';
import type { DeclaredAwsVpcTunnel } from './DeclaredAwsVpcTunnel';

/**
 * .what = the declastruct provider for aws resources
 * .why = provides type safety and reusability for the aws provider
 */
export type DeclastructAwsProvider = DeclastructProvider<
  {
    DeclaredAwsEc2Instance: DeclastructDao<
      typeof DeclaredAwsEc2Instance,
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
    DeclaredAwsLogGroup: DeclastructDao<
      typeof DeclaredAwsLogGroup,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsLogGroupReportCostOfIngestion: DeclastructDao<
      typeof DeclaredAwsLogGroupReportCostOfIngestion,
      ContextAwsApi & ContextLogTrail
    >;
    DeclaredAwsLogGroupReportDistOfPattern: DeclastructDao<
      typeof DeclaredAwsLogGroupReportDistOfPattern,
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
    DeclaredAwsVpcTunnel: DeclastructDao<
      typeof DeclaredAwsVpcTunnel,
      ContextAwsApi & ContextLogTrail
    >;
  },
  ContextAwsApi & ContextLogTrail
>;
