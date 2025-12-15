import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoInstance } from '../../domain.objects/DeclaredAwsSsoInstance';
import { getOneSsoInstance } from './getOneSsoInstance';

/**
 * .what = sets (findsert) an sso identity center instance
 * .why = enables declarative instance management for identity center
 *
 * .note
 *   - sso instances cannot be created via api; must be enabled in aws console
 *   - this operation only supports findsert: find existing or fail
 *   - use this to declare dependency on an existing instance
 */
export const setSsoInstance = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSsoInstance;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoInstance>> => {
    const instanceDesired = input.findsert;

    // lookup existing instance by ownerAccount (unique key)
    const instanceFound = await getOneSsoInstance(
      { by: { unique: { ownerAccount: instanceDesired.ownerAccount } } },
      context,
    );

    // if found, return it (findsert behavior)
    if (instanceFound) return instanceFound;

    // failfast: sso instances cannot be created via api
    BadRequestError.throw(
      'sso identity center instance not found. identity center must be enabled manually in the aws console before using this resource. see: https://docs.aws.amazon.com/singlesignon/latest/userguide/getting-started.html',
      { instanceDesired },
    );
  },
);
