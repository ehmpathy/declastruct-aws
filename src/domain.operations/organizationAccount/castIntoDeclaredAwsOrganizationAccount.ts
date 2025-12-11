import type { Account } from '@aws-sdk/client-organizations';
import { isUniDateTime } from '@ehmpathy/uni-time';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { assure, isPresent } from 'type-fns';

import type { DeclaredAwsOrganization } from '../../domain.objects/DeclaredAwsOrganization';
import {
  DeclaredAwsOrganizationAccount,
  type IamUserAccessToBilling,
  type OrganizationAccountJoinedMethod,
  type OrganizationAccountState,
} from '../../domain.objects/DeclaredAwsOrganizationAccount';

/**
 * .what = prefix for write-only values persisted as tags
 * .why = AWS doesn't return iamUserAccessToBilling/roleName on read, so we store them as tags
 */
const WRITEONLY_TAG_PREFIX = '_decla_writeonly_';

/**
 * .what = transforms AWS SDK Account to DeclaredAwsOrganizationAccount
 * .why = ensures type safety and readonly field enforcement
 * .note = requires organization ref (org accounts only, not standalone)
 */
export const castIntoDeclaredAwsOrganizationAccount = (input: {
  account: Account;
  organization: RefByUnique<typeof DeclaredAwsOrganization>;
  tags: Record<string, string> | null;
}): HasReadonly<typeof DeclaredAwsOrganizationAccount> => {
  // extract state from Status (deprecated) or State field
  const state = (input.account.Status ?? input.account.State) as
    | OrganizationAccountState
    | undefined;

  // extract write-only values from tags (AWS doesn't return these on read)
  // if not found in tags, omit the keys entirely (don't set to undefined)
  const iamUserAccessToBilling = input.tags?.[
    `${WRITEONLY_TAG_PREFIX}iamUserAccessToBilling`
  ] as IamUserAccessToBilling | undefined;
  const roleName = input.tags?.[`${WRITEONLY_TAG_PREFIX}roleName`];

  // filter out write-only tags from public tags
  const publicTags = input.tags
    ? Object.fromEntries(
        Object.entries(input.tags).filter(
          ([key]) => !key.startsWith(WRITEONLY_TAG_PREFIX),
        ),
      )
    : null;

  // parse joinedAt (only include if present)
  const joinedAt = input.account.JoinedTimestamp
    ? isUniDateTime.assure(input.account.JoinedTimestamp.toISOString())
    : undefined;

  // parse tags (only include if present)
  const tags =
    publicTags && Object.keys(publicTags).length > 0 ? publicTags : undefined;

  return assure(
    DeclaredAwsOrganizationAccount.as({
      id: assure(input.account.Id, isPresent),
      arn: assure(input.account.Arn, isPresent),
      name: assure(input.account.Name, isPresent),
      email: assure(input.account.Email, isPresent),
      organization: input.organization,
      state: state ?? 'ACTIVE',
      joinedMethod: input.account
        .JoinedMethod as OrganizationAccountJoinedMethod,
      // conditionally include optional fields only if defined (omit keys if undefined)
      ...(joinedAt !== undefined && { joinedAt }),
      ...(iamUserAccessToBilling && { iamUserAccessToBilling }),
      ...(roleName && { roleName }),
      ...(tags !== undefined && { tags }),
    }),
    hasReadonly({ of: DeclaredAwsOrganizationAccount }),
  );
};
