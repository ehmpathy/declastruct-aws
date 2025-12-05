import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsEc2Instance } from '../../domain.objects/DeclaredAwsEc2Instance';
import { getEc2Instance } from '../../domain.operations/ec2Instance/getEc2Instance';

/**
 * .what = declastruct DAO for AWS EC2 instance resources
 * .why = wraps existing EC2 operations to conform to declastruct interface
 * .note = EC2 instance creation not yet implemented; currently read-only
 */
export const DeclaredAwsEc2InstanceDao = new DeclastructDao<
  DeclaredAwsEc2Instance,
  typeof DeclaredAwsEc2Instance,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      return getEc2Instance({ by: { primary: input } }, context);
    },
    byUnique: async (input, context) => {
      return getEc2Instance({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsEc2Instance })(input))
        return getEc2Instance({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsEc2Instance })(input))
        return getEc2Instance({ by: { primary: input } }, context);

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input) => {
      // todo: EC2 instance creation not yet implemented
      BadRequestError.throw(
        'EC2 instance creation not yet supported by this DAO',
        { input },
      );
    },
  },
});
