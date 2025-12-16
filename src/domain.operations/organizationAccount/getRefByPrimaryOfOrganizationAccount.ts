import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  refByPrimary,
} from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';

import { getOneOrganizationAccount } from './getOneOrganizationAccount';

/**
 * .what = resolves any ref to an organization account into a primary ref (with id)
 * .why = ensures we always have the account id needed for aws api calls
 *
 * .note
 *   - if already RefByPrimary, returns as-is
 *   - if RefByUnique, looks up and failfasts if not found
 */
export const getRefByPrimaryOfOrganizationAccount = async (
  input: {
    ref: Ref<typeof DeclaredAwsOrganizationAccount>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<RefByPrimary<typeof DeclaredAwsOrganizationAccount>> => {
  // if already primary ref, return it
  if (isRefByPrimary({ of: DeclaredAwsOrganizationAccount })(input.ref))
    return input.ref;

  // if unique ref, get the resource and cast to ref
  if (isRefByUnique({ of: DeclaredAwsOrganizationAccount })(input.ref)) {
    const found = await getOneOrganizationAccount(
      { by: { unique: input.ref } },
      context,
    );

    // failfast if not found
    if (!found)
      throw new BadRequestError(
        'cannot refByPrimary an entity that cannot be found via refByUnique',
        { ref: input.ref },
      );

    return refByPrimary<typeof DeclaredAwsOrganizationAccount>(found);
  }

  // failfast on invalid ref type
  return UnexpectedCodePathError.throw(
    'ref is neither primary nor unique for DeclaredAwsOrganizationAccount',
    { ref: input.ref },
  );
};
