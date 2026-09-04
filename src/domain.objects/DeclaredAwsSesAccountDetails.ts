import { DomainEntity } from 'domain-objects';
import { withAssure } from 'type-fns';

/**
 * .what = the SES review states AWS reports for a production-access request
 * .why = the read boundary maps SES's ReviewDetails.Status enum; a closed union gives
 *   compile-time typo protection + symmetry with the other aws-enum fields in the family
 */
export const SES_REVIEW_STATUSES = [
  'PENDING',
  'GRANTED',
  'DENIED',
  'FAILED',
] as const;

export type SesReviewStatus = (typeof SES_REVIEW_STATUSES)[number];

/**
 * .what = guards a raw SES review-status string into the modeled union
 * .why = a value outside our union must fail loud at the read boundary (assure), not
 *   silently mistype and skew a plan diff (rule.require.assure-via-type-checks)
 */
export const isSesReviewStatus = withAssure(
  (value: string): value is SesReviewStatus =>
    (SES_REVIEW_STATUSES as readonly string[]).includes(value),
  { name: 'isSesReviewStatus' },
);

/**
 * .what = the SES account-level production-access posture for a region — the sandbox exit
 * .why = a new SES account starts in the SANDBOX: it may send only to VERIFIED recipients.
 *   production access lifts that gate so it can send to anyone. AWS models this via
 *   GetAccount (read) + PutAccountDetails (a request AWS REVIEWS, not an instant flip), so
 *   it earns a declared resource — declare it to REQUEST the sandbox exit via `apply`
 *
 * .identity
 *   - @unique = [region] — production access is granted per-region, so region is the
 *     natural key of this account-level singleton (the account is fixed by the creds)
 *   - no @primary — an account-scoped singleton, not an id-addressable resource
 *
 * .model = the request is ASYNCHRONOUS. PutAccountDetails with productionAccess 'enabled'
 *   opens an AWS review; the account stays in the sandbox until AWS GRANTS it. so a fresh
 *   apply legitimately reads a request still under review — that is a normal KEEP, NOT a
 *   failure (the same async shape as a domain identity's `unresolved` dkim). the readonly
 *   fields carry the true nuance: `reviewStatus` (PENDING/GRANTED/DENIED/FAILED) and
 *   `productionAccessEnabled` (the live flag)
 *
 * .note = read-mostly: get reads GetAccount, set.findsert submits PutAccountDetails (and
 *   tolerates a ConflictException = a review already in flight = converge). there is no way
 *   to REQUEST a return to the sandbox, so `productionAccess` is only ever declared 'enabled'
 */
export interface DeclaredAwsSesAccountDetails {
  /**
   * .what = the region this production-access posture applies to
   * .note = @unique — prod access is per-region; the account is fixed by the creds
   * .example = 'us-east-1'
   */
  region: string;

  /**
   * .what = the desired sandbox posture — 'enabled' requests the sandbox exit
   * .note = only ever declared 'enabled'; 'sandbox' is the read-back of an un-requested
   *   account. a re-declare with a request already in flight (or granted) converges to KEEP
   */
  productionAccess: 'enabled' | 'sandbox';

  /**
   * .what = the kind of mail this account sends — required by PutAccountDetails
   */
  mailType: 'MARKETING' | 'TRANSACTIONAL';

  /**
   * .what = the account's website — required by PutAccountDetails to describe the use case
   * .example = 'https://ehmpathy.com'
   */
  websiteUrl: string;

  /**
   * .what = the preferred language for the AWS review case
   * .note = null = AWS default (EN)
   */
  contactLanguage: 'EN' | 'JA' | null;

  /**
   * .what = extra emails AWS copies on the review-case updates
   * .note = null = none
   */
  additionalContactEmails: string[] | null;

  /**
   * .what = the live production-access flag AWS reports
   * .note = @readonly — false while in the sandbox (or under review), true once granted
   */
  productionAccessEnabled?: boolean;

  /**
   * .what = the account's enforcement posture (HEALTHY/PROBATION/SHUTDOWN)
   * .note = @readonly
   */
  enforcementStatus?: string | null;

  /**
   * .what = the status of the latest production-access review
   * .note = @readonly — null when no request has been submitted
   */
  reviewStatus?: SesReviewStatus | null;
}

export class DeclaredAwsSesAccountDetails
  extends DomainEntity<DeclaredAwsSesAccountDetails>
  implements DeclaredAwsSesAccountDetails
{
  // no primary — an account-scoped singleton, not an id-addressable resource

  /**
   * .what = unique by the region the posture applies to
   */
  public static unique = ['region'] as const;

  /**
   * .what = no aws-assigned identity attributes
   */
  public static metadata = [] as const;

  /**
   * .what = aws-populated attributes read back from the account
   */
  public static readonly = [
    'productionAccessEnabled',
    'enforcementStatus',
    'reviewStatus',
  ] as const;
}
