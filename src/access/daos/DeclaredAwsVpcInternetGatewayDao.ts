import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsVpcInternetGateway } from '@src/domain.objects/DeclaredAwsVpcInternetGateway';
import { delVpcInternetGateway } from '@src/domain.operations/vpcInternetGateway/delVpcInternetGateway';
import { getOneVpcInternetGateway } from '@src/domain.operations/vpcInternetGateway/getOneVpcInternetGateway';
import { setVpcInternetGateway } from '@src/domain.operations/vpcInternetGateway/setVpcInternetGateway';

/**
 * .what = declastruct DAO for AWS VPC internet gateway resources
 * .why = wraps VPC internet gateway operations to conform to declastruct interface
 * .note
 *   - findsert = create and attach if not found, return extant (idempotent)
 *   - upsert = create or update tags
 *   - delete = detach and remove internet gateway
 */
export const DeclaredAwsVpcInternetGatewayDao = genDeclastructDao<
  typeof DeclaredAwsVpcInternetGateway,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsVpcInternetGateway,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneVpcInternetGateway({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneVpcInternetGateway({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setVpcInternetGateway({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setVpcInternetGateway({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delVpcInternetGateway({ ref: input }, context);
    },
  },
});
