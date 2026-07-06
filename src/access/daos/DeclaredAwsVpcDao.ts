import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';
import { delVpc } from '@src/domain.operations/vpc/delVpc';
import { getOneVpc } from '@src/domain.operations/vpc/getOneVpc';
import { setVpc } from '@src/domain.operations/vpc/setVpc';

/**
 * .what = declastruct DAO for AWS VPC resources
 * .why = wraps VPC operations to conform to declastruct interface
 * .note
 *   - findsert = create if not found, return extant (idempotent)
 *   - upsert = create or update tags
 *   - delete = remove VPC (dependent resources must be deleted first)
 */
export const DeclaredAwsVpcDao = genDeclastructDao<
  typeof DeclaredAwsVpc,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsVpc,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneVpc({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneVpc({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setVpc({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setVpc({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delVpc({ ref: input }, context);
    },
  },
});
