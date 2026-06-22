import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
import { setEc2Instance } from '@src/domain.operations/ec2Instance/setEc2Instance';

/**
 * .what = declastruct DAO for AWS EC2 instance resources
 * .why = wraps EC2 operations to conform to declastruct interface
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
    findsert: async (input, context) => {
      return setEc2Instance({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setEc2Instance({ upsert: input }, context);
    },
    delete: null,
  },
});
