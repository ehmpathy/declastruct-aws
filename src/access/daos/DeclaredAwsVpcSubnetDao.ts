import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';
import { delVpcSubnet } from '@src/domain.operations/vpcSubnet/delVpcSubnet';
import { getOneVpcSubnet } from '@src/domain.operations/vpcSubnet/getOneVpcSubnet';
import { setVpcSubnet } from '@src/domain.operations/vpcSubnet/setVpcSubnet';

/**
 * .what = declastruct DAO for AWS VPC subnet resources
 * .why = wraps VPC subnet operations to conform to declastruct interface
 * .note
 *   - findsert = create if not found, return extant (idempotent)
 *   - upsert = create or update tags
 *   - delete = remove subnet (resources in subnet must be deleted first)
 */
export const DeclaredAwsVpcSubnetDao = genDeclastructDao<
  typeof DeclaredAwsVpcSubnet,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsVpcSubnet,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneVpcSubnet({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneVpcSubnet({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setVpcSubnet({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setVpcSubnet({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delVpcSubnet({ ref: input }, context);
    },
  },
});
