import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsVpcRouteTable } from '@src/domain.objects/DeclaredAwsVpcRouteTable';
import { delVpcRouteTable } from '@src/domain.operations/vpcRouteTable/delVpcRouteTable';
import { getOneVpcRouteTable } from '@src/domain.operations/vpcRouteTable/getOneVpcRouteTable';
import { setVpcRouteTable } from '@src/domain.operations/vpcRouteTable/setVpcRouteTable';

/**
 * .what = declastruct DAO for AWS VPC route table resources
 * .why = wraps VPC route table operations to conform to declastruct interface
 * .note
 *   - findsert = create with routes and associations if not found, return extant (idempotent)
 *   - upsert = create or sync routes, associations, and tags
 *   - delete = remove associations, routes, and route table
 */
export const DeclaredAwsVpcRouteTableDao = genDeclastructDao<
  typeof DeclaredAwsVpcRouteTable,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsVpcRouteTable,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneVpcRouteTable({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneVpcRouteTable({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setVpcRouteTable({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setVpcRouteTable({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delVpcRouteTable({ ref: input }, context);
    },
  },
});
