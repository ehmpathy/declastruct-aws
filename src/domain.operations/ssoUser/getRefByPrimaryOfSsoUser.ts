import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  refByPrimary,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';

import { getOneSsoUser } from './getOneSsoUser';

/**
 * .what = resolves any ref to an sso user into a primary ref (with id)
 * .why = ensures we always have the id needed for aws api calls
 *
 * .note
 *   - if already RefByPrimary, returns as-is
 *   - if RefByUnique, looks up and returns null if not found
 */
export const getRefByPrimaryOfSsoUser = async (
  input: {
    ref: Ref<typeof DeclaredAwsSsoUser>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<RefByPrimary<typeof DeclaredAwsSsoUser> | null> => {
  // if already primary ref, return it
  if (isRefByPrimary({ of: DeclaredAwsSsoUser })(input.ref)) return input.ref;

  // if unique ref, get the resource and cast to ref
  if (isRefByUnique({ of: DeclaredAwsSsoUser })(input.ref)) {
    const found = await getOneSsoUser({ by: { unique: input.ref } }, context);

    // return null if not found
    if (!found) return null;

    return refByPrimary<typeof DeclaredAwsSsoUser>(found);
  }

  // failfast on invalid ref type
  return UnexpectedCodePathError.throw(
    'ref is neither primary nor unique for DeclaredAwsSsoUser',
    { ref: input.ref },
  );
};
