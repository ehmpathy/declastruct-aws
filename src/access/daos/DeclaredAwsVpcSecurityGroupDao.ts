import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsVpcSecurityGroup } from '@src/domain.objects/DeclaredAwsVpcSecurityGroup';
import { delVpcSecurityGroup } from '@src/domain.operations/vpcSecurityGroup/delVpcSecurityGroup';
import { getOneVpcSecurityGroup } from '@src/domain.operations/vpcSecurityGroup/getOneVpcSecurityGroup';
import { setVpcSecurityGroup } from '@src/domain.operations/vpcSecurityGroup/setVpcSecurityGroup';

/**
 * .what = declastruct DAO for AWS VPC security group resources
 * .why = wraps VPC security group operations to conform to declastruct interface
 * .note
 *   - findsert = create if not found, return extant (idempotent)
 *   - upsert = create or sync rules and tags
 *   - delete = remove security group (dependent resources must be updated first)
 */
export const DeclaredAwsVpcSecurityGroupDao = genDeclastructDao<
  typeof DeclaredAwsVpcSecurityGroup,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsVpcSecurityGroup,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneVpcSecurityGroup({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneVpcSecurityGroup({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setVpcSecurityGroup({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setVpcSecurityGroup({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delVpcSecurityGroup({ ref: input }, context);
    },
  },
});
