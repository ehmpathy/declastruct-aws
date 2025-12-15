import { genDeclastructDao } from 'declastruct';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsRdsCluster } from '../../domain.objects/DeclaredAwsRdsCluster';
import { getRdsCluster } from '../../domain.operations/rdsCluster/getRdsCluster';

/**
 * .what = declastruct DAO for AWS RDS cluster resources
 * .why = wraps existing RDS operations to conform to declastruct interface
 * .note = RDS cluster creation not yet implemented; currently read-only
 */
export const DeclaredAwsRdsClusterDao = genDeclastructDao<
  typeof DeclaredAwsRdsCluster,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsRdsCluster,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getRdsCluster({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input) => {
      // todo: RDS cluster creation not yet implemented
      BadRequestError.throw(
        'RDS cluster creation not yet supported by this DAO',
        { input },
      );
    },
    upsert: null,
    delete: null,
  },
});
