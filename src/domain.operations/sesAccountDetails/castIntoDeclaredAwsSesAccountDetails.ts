import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import {
  DeclaredAwsSesAccountDetails,
  isSesReviewStatus,
} from '@src/domain.objects/DeclaredAwsSesAccountDetails';

/**
 * .what = transforms a raw SES GetAccount read into DeclaredAwsSesAccountDetails
 * .why = ensures type safety at the sdk boundary; maps the async review into a convergent
 *   `productionAccess` so a request still under review reads as a normal KEEP, not drift —
 *   'enabled' when the live flag is on OR a review is unresolved (the request is in flight);
 *   'sandbox' otherwise (never requested, or DENIED/FAILED so a re-apply retries)
 * .note = only called when a request EXISTS (the getOne treats a bare sandbox as absent),
 *   so live Details carry the mailType + websiteUrl the request was submitted with
 */
export const castIntoDeclaredAwsSesAccountDetails = (input: {
  region: string;
  productionAccessEnabled: boolean;
  enforcementStatus: string | null;
  reviewStatus: string | null;
  mailType: string | null;
  websiteUrl: string | null;
  contactLanguage: string | null;
  additionalContactEmails: string[] | null;
}): HasReadonly<typeof DeclaredAwsSesAccountDetails> => {
  // a raw aws review-status fails loud if outside our modeled union; null passes through
  const reviewStatus = input.reviewStatus
    ? isSesReviewStatus.assure(input.reviewStatus)
    : null;

  // the request is satisfied-in-progress once the flag is on OR a review is unresolved
  const productionAccess =
    input.productionAccessEnabled || reviewStatus === 'PENDING'
      ? 'enabled'
      : 'sandbox';

  // a request that exists carries the details it was submitted with (fail loud if absent —
  // an inconsistent aws state we must not paper over)
  const mailType =
    input.mailType ??
    UnexpectedCodePathError.throw(
      'ses account has a production-access request but no mailType',
      { input },
    );
  if (mailType !== 'MARKETING' && mailType !== 'TRANSACTIONAL')
    UnexpectedCodePathError.throw('unexpected ses account mailType', { input });

  const contactLanguage = input.contactLanguage;
  if (
    contactLanguage !== null &&
    contactLanguage !== 'EN' &&
    contactLanguage !== 'JA'
  )
    UnexpectedCodePathError.throw('unexpected ses account contactLanguage', {
      input,
    });

  return assure(
    DeclaredAwsSesAccountDetails.as({
      region: input.region,
      productionAccess,
      mailType,
      websiteUrl:
        input.websiteUrl ??
        UnexpectedCodePathError.throw(
          'ses account has a production-access request but no websiteUrl',
          { input },
        ),
      contactLanguage,
      additionalContactEmails: input.additionalContactEmails,
      productionAccessEnabled: input.productionAccessEnabled,
      enforcementStatus: input.enforcementStatus,
      reviewStatus,
    }),
    hasReadonly({ of: DeclaredAwsSesAccountDetails }),
  );
};
