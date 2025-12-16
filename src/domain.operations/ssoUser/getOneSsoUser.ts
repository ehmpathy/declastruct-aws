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
import { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';

import { getAllSsoUsers } from './getAllSsoUsers';

/**
 * .what = retrieves an sso user from aws identity store
 * .why = enables lookup by primary (id) or unique (instance, userName)
 */
export const getOneSsoUser = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSsoUser>;
        unique: RefByUnique<typeof DeclaredAwsSsoUser>;
        ref: Ref<typeof DeclaredAwsSsoUser>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoUser> | null> => {
    // resolve ref to primary or unique
    const by = (() => {
      if (!input.by.ref) return input.by;
      if (isRefByUnique({ of: DeclaredAwsSsoUser })(input.by.ref))
        return { unique: input.by.ref };
      if (isRefByPrimary({ of: DeclaredAwsSsoUser })(input.by.ref))
        return { primary: input.by.ref };
      return UnexpectedCodePathError.throw(
        'ref is neither unique nor primary',
        {
          input,
        },
      );
    })();

    // lookup by unique: use getAllSsoUsers and filter by userName
    if (by.unique) {
      const users = await getAllSsoUsers(
        { where: { instance: by.unique.instance } },
        context,
      );
      return users.find((u) => u.userName === by.unique.userName) ?? null;
    }

    // lookup by primary: not fully supported - need instance context
    if (by.primary) {
      return UnexpectedCodePathError.throw(
        'primary key lookup not supported; use unique key with instance ref',
        { by },
      );
    }

    return UnexpectedCodePathError.throw('could not resolve user lookup', {
      by,
    });
  },
);
