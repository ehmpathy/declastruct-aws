import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { getEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/getEc2InstanceSession';
import { setEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/setEc2InstanceSession';

/**
 * .what = declastruct DAO for AWS EC2 instance session resources
 * .why = wraps session operations to conform to declastruct interface
 * .note = sessions control instance lifecycle (active/stopped/hibernated)
 */
export const DeclaredAwsEc2InstanceSessionDao = genDeclastructDao<
  typeof DeclaredAwsEc2InstanceSession,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsEc2InstanceSession,
  get: {
    one: {
      byPrimary: null, // sessions don't have a primary key
      byUnique: async (input, context) => {
        return getEc2InstanceSession(
          { by: { instance: input.instance } },
          context,
        );
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setEc2InstanceSession({ session: input }, context);
    },
    upsert: async (input, context) => {
      return setEc2InstanceSession({ session: input }, context);
    },
    delete: null, // sessions are not deleted; set to desired state instead
  },
});
