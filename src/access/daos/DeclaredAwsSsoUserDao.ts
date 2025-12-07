import { DeclastructDao } from 'declastruct';
import { isRefByPrimary, isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoUser } from '../../domain.objects/DeclaredAwsSsoUser';
import { getOneSsoUser } from '../../domain.operations/ssoUser/getOneSsoUser';
import { setSsoUser } from '../../domain.operations/ssoUser/setSsoUser';

/**
 * .what = declastruct DAO for AWS SSO user resources
 * .why = wraps SSO user operations to conform to declastruct interface
 */
export const DeclaredAwsSsoUserDao = new DeclastructDao<
  DeclaredAwsSsoUser,
  typeof DeclaredAwsSsoUser,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byPrimary: async (input, context) => {
      // note: primary lookup not fully supported; use byUnique with instance ref
      UnexpectedCodePathError.throw(
        'primary lookup not supported; use byUnique with instance ref',
        { input },
      );
    },
    byUnique: async (input, context) => {
      return getOneSsoUser({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsSsoUser })(input))
        return getOneSsoUser({ by: { unique: input } }, context);

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsSsoUser })(input)) {
        // primary lookup requires identityStoreId
        UnexpectedCodePathError.throw(
          'primary lookup requires identityStoreId; use byUnique or direct operation',
          { input },
        );
      }

      // failfast if ref is neither unique nor primary
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setSsoUser({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setSsoUser({ upsert: input }, context);
    },
  },
});
