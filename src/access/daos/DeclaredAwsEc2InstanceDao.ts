import { genDeclastructDao } from 'declastruct';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsEc2Instance } from '../../domain.objects/DeclaredAwsEc2Instance';
import { getEc2Instance } from '../../domain.operations/ec2Instance/getEc2Instance';

/**
 * .what = declastruct DAO for AWS EC2 instance resources
 * .why = wraps existing EC2 operations to conform to declastruct interface
 * .note = EC2 instance creation not yet implemented; currently read-only
 */
export const DeclaredAwsEc2InstanceDao = genDeclastructDao<
  typeof DeclaredAwsEc2Instance,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsEc2Instance,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getEc2Instance({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getEc2Instance({ by: { unique: input } }, context);
      },
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
    upsert: null,
    delete: null,
  },
});
