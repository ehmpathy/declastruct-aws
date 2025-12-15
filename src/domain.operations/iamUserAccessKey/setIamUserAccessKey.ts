import { BadRequestError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsIamUserAccessKey } from '../../domain.objects/DeclaredAwsIamUserAccessKey';

/**
 * .what = fails fast - set operations not supported for access keys
 * .why = IAM user access keys have been superseded by SSO and OIDC federation.
 *        they don't support tags, so we can't persist an exid for unique lookups.
 *        this library focuses on auditing and purging existing keys, not managing them.
 *
 * .ref = https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
 */
export const setIamUserAccessKey = async (
  _input: PickOne<{
    findsert: DeclaredAwsIamUserAccessKey;
    upsert: DeclaredAwsIamUserAccessKey;
  }>,
  _context: ContextAwsApi & VisualogicContext,
): Promise<never> => {
  BadRequestError.throw(
    'setIamUserAccessKey is not supported. IAM user access keys have been superseded by SSO and OIDC federation and are no longer recommended for new use. use getAllIamUserAccessKeys + delIamUserAccessKey to audit and purge existing keys.',
  );
};
