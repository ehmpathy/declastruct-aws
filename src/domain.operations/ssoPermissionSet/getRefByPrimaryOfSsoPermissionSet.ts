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
import { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';

import { getOneSsoPermissionSet } from './getOneSsoPermissionSet';

/**
 * .what = resolves any ref to a permission set into a primary ref (with arn)
 * .why = ensures we always have the arn needed for aws api calls
 *
 * .note
 *   - if already RefByPrimary, returns as-is
 *   - if RefByUnique, looks up and returns null if not found
 */
export const getRefByPrimaryOfSsoPermissionSet = async (
  input: {
    ref: Ref<typeof DeclaredAwsSsoPermissionSet>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<RefByPrimary<typeof DeclaredAwsSsoPermissionSet> | null> => {
  // if already primary ref, return it
  if (isRefByPrimary({ of: DeclaredAwsSsoPermissionSet })(input.ref))
    return input.ref;

  // if unique ref, get the resource and cast to ref
  if (isRefByUnique({ of: DeclaredAwsSsoPermissionSet })(input.ref)) {
    const found = await getOneSsoPermissionSet(
      { by: { unique: input.ref } },
      context,
    );

    // return null if not found
    if (!found) return null;

    return refByPrimary<typeof DeclaredAwsSsoPermissionSet>(found);
  }

  // failfast on invalid ref type
  return UnexpectedCodePathError.throw(
    'ref is neither primary nor unique for DeclaredAwsSsoPermissionSet',
    { ref: input.ref },
  );
};
