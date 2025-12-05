import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsRdsCluster } from '../../domain.objects/DeclaredAwsRdsCluster';
import { getRdsCluster } from '../../domain.operations/rdsCluster/getRdsCluster';

/**
 * .what = declastruct DAO for AWS RDS cluster resources
 * .why = wraps existing RDS operations to conform to declastruct interface
 * .note = RDS cluster creation not yet implemented; currently read-only
 */
export const DeclaredAwsRdsClusterDao = new DeclastructDao<
  DeclaredAwsRdsCluster,
  typeof DeclaredAwsRdsCluster,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getRdsCluster({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsRdsCluster })(input))
        return getRdsCluster({ by: { unique: input } }, context);

      // failfast if ref is not by unique (RDS clusters don't have primary key lookup)
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input) => {
      // todo: RDS cluster creation not yet implemented
      BadRequestError.throw(
        'RDS cluster creation not yet supported by this DAO',
        { input },
      );
    },
  },
});
