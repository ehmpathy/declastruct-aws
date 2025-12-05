import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroup } from '../../domain.objects/DeclaredAwsLogGroup';
import { getOneLogGroup } from '../../domain.operations/logGroup/getOneLogGroup';

/**
 * .what = declastruct DAO for AWS CloudWatch Log Group resources
 * .why = wraps Log Group operations to conform to declastruct interface
 * .note = no set operations — log groups are auto-created by Lambda/etc
 */
export const DeclaredAwsLogGroupDao = new DeclastructDao<
  DeclaredAwsLogGroup,
  typeof DeclaredAwsLogGroup,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getOneLogGroup({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getOneLogGroup({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsLogGroup })(input))
        return getOneLogGroup({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsLogGroup })(input))
        return getOneLogGroup({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input) => {
      // log groups are auto-created by Lambda/etc — manual creation not supported yet
      BadRequestError.throw(
        'Log group creation not supported by this DAO yet',
        { input },
      );
    },
  },
});
