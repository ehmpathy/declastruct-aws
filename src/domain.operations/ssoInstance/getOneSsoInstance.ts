import {
  ListInstancesCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsoInstance } from '@src/domain.objects/DeclaredAwsSsoInstance';

import { castIntoDeclaredAwsSsoInstance } from './castIntoDeclaredAwsSsoInstance';

/**
 * .what = retrieves a single sso identity center instance
 * .why = enables lookup by primary (arn), unique (ownerAccount), or auth
 *
 * .note
 *   - returns null if identity center is not enabled
 *   - most organizations have exactly one sso instance
 */
export const getOneSsoInstance = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSsoInstance>;
        unique: RefByUnique<typeof DeclaredAwsSsoInstance>;
        ref: Ref<typeof DeclaredAwsSsoInstance>;
        auth: true;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoInstance> | null> => {
    // route by.ref to appropriate handler
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsSsoInstance })(input.by.ref))
        return getOneSsoInstance({ by: { unique: input.by.ref } }, context);
      if (isRefByPrimary({ of: DeclaredAwsSsoInstance })(input.by.ref))
        return getOneSsoInstance({ by: { primary: input.by.ref } }, context);
      UnexpectedCodePathError.throw('ref is neither unique nor primary', {
        input,
      });
    }

    // create sso admin client
    const sso = new SSOAdminClient({ region: context.aws.credentials.region });

    // list instances for this account
    const response = await sso.send(new ListInstancesCommand({}));

    // return null if no instances (identity center not enabled)
    const instances = response.Instances ?? [];
    if (instances.length === 0) return null;

    // by.auth - return the authenticated account's instance
    if (input.by.auth) {
      if (instances.length > 1)
        UnexpectedCodePathError.throw(
          'multiple sso instances found; expected one',
          { instances },
        );
      const instance = instances[0];
      if (!instance) return null;
      return castIntoDeclaredAwsSsoInstance(instance);
    }

    // by.primary - find by arn
    if (input.by.primary) {
      const found = instances.find(
        (i) => i.InstanceArn === input.by.primary!.arn,
      );
      if (!found) return null;
      return castIntoDeclaredAwsSsoInstance(found);
    }

    // by.unique - find by ownerAccount.id
    if (input.by.unique) {
      const found = instances.find(
        (i) => i.OwnerAccountId === input.by.unique!.ownerAccount.id,
      );
      if (!found) return null;
      return castIntoDeclaredAwsSsoInstance(found);
    }

    // unexpected codepath
    UnexpectedCodePathError.throw('invalid input', { input });
  },
);
