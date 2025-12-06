import type { Account } from '@aws-sdk/client-organizations';
import { isUniDateTime } from '@ehmpathy/uni-time';
import {
  type HasReadonly,
  hasReadonly,
  type RefByPrimary,
} from 'domain-objects';
import { assure, isPresent } from 'type-fns';

import type { DeclaredAwsOrganization } from '../../domain.objects/DeclaredAwsOrganization';
import {
  DeclaredAwsOrganizationAccount,
  type OrganizationAccountJoinedMethod,
  type OrganizationAccountState,
} from '../../domain.objects/DeclaredAwsOrganizationAccount';

/**
 * .what = transforms AWS SDK Account to DeclaredAwsOrganizationAccount
 * .why = ensures type safety and readonly field enforcement
 * .note = requires organization ref (org accounts only, not standalone)
 */
export const castIntoDeclaredAwsOrganizationAccount = (input: {
  account: Account;
  organization: RefByPrimary<typeof DeclaredAwsOrganization>;
  tags: Record<string, string> | null;
}): HasReadonly<typeof DeclaredAwsOrganizationAccount> => {
  // extract state from Status (deprecated) or State field
  const state = (input.account.Status ?? input.account.State) as
    | OrganizationAccountState
    | undefined;

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
      joinedAt: input.account.JoinedTimestamp
        ? isUniDateTime.assure(input.account.JoinedTimestamp.toISOString())
        : undefined,
      // Note: iamUserAccessToBilling and roleName are write-only (not returned by API)
      tags: input.tags ?? undefined,
    }),
    hasReadonly({ of: DeclaredAwsOrganizationAccount }),
  );
};
