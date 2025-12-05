import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
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

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
import { castIntoDeclaredAwsIamRole } from './castIntoDeclaredAwsIamRole';

/**
 * .what = retrieves an iam role from aws
 * .why = enables lookup by primary (arn) or unique (name)
 */
export const getIamRole = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsIamRole>;
        unique: RefByUnique<typeof DeclaredAwsIamRole>;
        ref: Ref<typeof DeclaredAwsIamRole>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsIamRole> | null> => {
    // resolve ref to primary or unique
    const by = await (async () => {
      // passthrough if not ref
      if (!input.by.ref) return input.by;

      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamRole })(input.by.ref))
        return { unique: input.by.ref };

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsIamRole })(input.by.ref))
        return { primary: input.by.ref };

      // failfast if ref is neither unique nor primary
      return UnexpectedCodePathError.throw(
        'ref is neither unique nor primary',
        {
          input,
        },
      );
    })();

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // resolve role name for lookup
    const roleName = (() => {
      // if by unique, use name directly
      if (by.unique) return by.unique.name;

      // if by primary, extract name from arn
      if (by.primary) {
        const arnParts = by.primary.arn.split('/');
        return arnParts[arnParts.length - 1];
      }

      // failfast if neither
      return UnexpectedCodePathError.throw('could not resolve role name', {
        by,
      });
    })();

    // send command
    try {
      const response = await iam.send(
        new GetRoleCommand({ RoleName: roleName }),
      );

      // failfast if role not in response
      if (!response.Role)
        return UnexpectedCodePathError.throw('role not in response', {
          response,
        });

      // cast to domain format
      return castIntoDeclaredAwsIamRole(response.Role);
    } catch (error) {
      // return null if role not found
      if (error instanceof Error && error.name === 'NoSuchEntityException')
        return null;
      throw error;
    }
  },
);
