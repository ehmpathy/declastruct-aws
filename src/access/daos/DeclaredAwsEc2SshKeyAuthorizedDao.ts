import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
import { getOneEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/getOneEc2SshKeyAuthorized';
import { setEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/setEc2SshKeyAuthorized';

/**
 * .what = declastruct DAO for AWS EC2 authorized SSH key resources
 * .why = wraps the ssh key operations to conform to the declastruct interface
 *        so the authorization can be driven declaratively via plan/apply
 * .note
 *   - findsert is cheap on repeat: it finds the extant authorization from the
 *     SSM Parameter Store track layer and returns it without a re-push through
 *     EC2 Instance Connect (which requires an active instance)
 *   - upsert always re-pushes via Instance Connect (re-authorize on demand)
 */
export const DeclaredAwsEc2SshKeyAuthorizedDao = genDeclastructDao<
  typeof DeclaredAwsEc2SshKeyAuthorized,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsEc2SshKeyAuthorized,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneEc2SshKeyAuthorized({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      // find the extant authorization first — cheap param lookup, no re-push
      const found = await getOneEc2SshKeyAuthorized(
        {
          by: {
            unique: { instance: input.instance, comment: input.comment },
          },
        },
        context,
      );
      if (found) return found;

      // absent — authorize the key (pushes via Instance Connect, needs active)
      return setEc2SshKeyAuthorized(input, context);
    },
    upsert: async (input, context) => {
      return setEc2SshKeyAuthorized(input, context);
    },
    delete: null,
  },
});
