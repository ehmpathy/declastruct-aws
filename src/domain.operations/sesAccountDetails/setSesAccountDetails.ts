import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { putAccountDetails } from '@src/access/sdks/sdkSesv2/putAccountDetails';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesAccountDetails } from '@src/domain.objects/DeclaredAwsSesAccountDetails';

import { castIntoDeclaredAwsSesAccountDetails } from './castIntoDeclaredAwsSesAccountDetails';
import { getOneSesAccountDetails } from './getOneSesAccountDetails';

/**
 * .what = submits (or reconciles) the SES production-access request for a region
 * .why = the declarative sandbox-exit — findsert submits the request if none is in flight;
 *   upsert re-submits the account details. AWS REVIEWS the request (it does not flip the
 *   flag inline), so a fresh apply lands the account in an unresolved review — a normal KEEP
 *
 * .idempotency
 *   - findsert: getOne returns null only for a bare sandbox (no request); so a submit fires
 *     just once. a request already in flight (or granted) is found → returned unchanged.
 *   - a ConflictException = a review already in flight = converge (the request IS submitted),
 *     so it is tolerated, then the live posture is read back.
 *
 * .note = there is no api to REQUEST a return to the sandbox, so a 'sandbox' desired is a
 *   no-op (the account is already there, or a review is in flight the human must let finish)
 */
export const setSesAccountDetails = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSesAccountDetails;
      upsert: DeclaredAwsSesAccountDetails;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSesAccountDetails>> => {
    const desired = input.findsert ?? input.upsert;

    // find the extant request by region
    const foundBefore = await getOneSesAccountDetails(
      { by: { unique: { region: desired.region } } },
      context,
    );

    // findsert: a request already in flight (or granted) is returned unchanged (KEEP)
    if (foundBefore && input.findsert) return foundBefore;

    // a 'sandbox' desired never submits — there is no api to un-request production access
    if (desired.productionAccess !== 'enabled') {
      if (foundBefore) return foundBefore;
      // an un-requested sandbox with a 'sandbox' desired is already converged; echo it back
      return castIntoDeclaredAwsSesAccountDetails({
        region: desired.region,
        productionAccessEnabled: false,
        enforcementStatus: null,
        reviewStatus: null,
        mailType: desired.mailType,
        websiteUrl: desired.websiteUrl,
        contactLanguage: desired.contactLanguage,
        additionalContactEmails: desired.additionalContactEmails,
      });
    }

    // submit the production-access request (tolerate a review already in flight = converge)
    try {
      await putAccountDetails(
        {
          mailType: desired.mailType,
          websiteUrl: desired.websiteUrl,
          productionAccessEnabled: true,
          contactLanguage: desired.contactLanguage,
          additionalContactEmails: desired.additionalContactEmails,
        },
        context,
      );
    } catch (error) {
      // a ConflictException means a review is already in flight — the request is submitted, so
      // converge; any other error is a real failure and must surface (rule.forbid.failhide)
      if (!(error instanceof Error) || error.name !== 'ConflictException')
        throw error;
    }

    // read back the live posture; on read-after-write lag fall back to the just-submitted
    // request as an unresolved review (the submit succeeded, so the request DOES exist)
    const foundAfter = await getOneSesAccountDetails(
      { by: { unique: { region: desired.region } } },
      context,
    );
    return (
      foundAfter ??
      castIntoDeclaredAwsSesAccountDetails({
        region: desired.region,
        productionAccessEnabled: false,
        enforcementStatus: null,
        reviewStatus: 'PENDING',
        mailType: desired.mailType,
        websiteUrl: desired.websiteUrl,
        contactLanguage: desired.contactLanguage,
        additionalContactEmails: desired.additionalContactEmails,
      })
    );
  },
);
