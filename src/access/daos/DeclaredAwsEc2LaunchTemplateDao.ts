import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';
import { getEc2LaunchTemplate } from '@src/domain.operations/ec2LaunchTemplate/getEc2LaunchTemplate';
import { setEc2LaunchTemplate } from '@src/domain.operations/ec2LaunchTemplate/setEc2LaunchTemplate';

/**
 * .what = declastruct DAO for AWS EC2 launch template resources
 * .why = wraps launch template operations to conform to declastruct interface
 */
export const DeclaredAwsEc2LaunchTemplateDao = genDeclastructDao<
  typeof DeclaredAwsEc2LaunchTemplate,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsEc2LaunchTemplate,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getEc2LaunchTemplate({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getEc2LaunchTemplate({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setEc2LaunchTemplate({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setEc2LaunchTemplate({ upsert: input }, context);
    },
    delete: null, // AWS launch templates can be deleted but not implemented yet
  },
});
