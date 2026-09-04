import { asProcedure } from 'as-procedure';
import type { HasReadonly, RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';

import { getAccount } from '@src/access/sdks/sdkSesv2/getAccount';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesAccountDetails } from '@src/domain.objects/DeclaredAwsSesAccountDetails';

import { castIntoDeclaredAwsSesAccountDetails } from './castIntoDeclaredAwsSesAccountDetails';

/**
 * .what = reads the SES production-access posture for a region (by its unique region key)
 * .why = enables declarative drift detection; models the sandbox as ABSENT so a plan reads
 *   CREATE (→ set.findsert submits the request), and a request in flight (or granted) as
 *   PRESENT so a re-plan converges to KEEP (rule.forbid.plan-fail-on-apply-guided-prereq)
 * .model = absent-when-sandbox: a bare sandbox account (no request, or a DENIED/FAILED one)
 *   returns null so a re-apply retries the request; a live flag OR an unresolved review
 *   returns the cast object. an account-scoped singleton has no primary — unique (region)
 *   is the whole key
 */
export const getOneSesAccountDetails = asProcedure(
  async (
    input: {
      by: { unique: RefByUnique<typeof DeclaredAwsSesAccountDetails> };
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSesAccountDetails> | null> => {
    const region = input.by.unique.region;

    // read the live account posture
    const account = await getAccount({}, context);

    // absent-when-sandbox: a request in flight (unresolved review) or a granted flag is
    // PRESENT; a bare sandbox (or a DENIED/FAILED request) is ABSENT so a re-apply retries
    const hasRequest =
      account.productionAccessEnabled || account.reviewStatus === 'PENDING';
    if (!hasRequest) return null;

    // cast the live posture to domain format
    return castIntoDeclaredAwsSesAccountDetails({ region, ...account });
  },
);
