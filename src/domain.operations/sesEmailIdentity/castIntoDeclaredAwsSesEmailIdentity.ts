import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import {
  DeclaredAwsSesEmailIdentity,
  isSesDkimStatus,
} from '@src/domain.objects/DeclaredAwsSesEmailIdentity';
import { DeclaredAwsSesMailFrom } from '@src/domain.objects/DeclaredAwsSesMailFrom';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = transforms a raw SES identity read into DeclaredAwsSesEmailIdentity
 * .why = ensures type safety at the sdk boundary; maps the aws verified-flag to a
 *   'verified' | 'unresolved' status so a fresh apply (dns not yet pasted) reads as a
 *   normal KEEP, not drift
 */
export const castIntoDeclaredAwsSesEmailIdentity = (input: {
  identity: string;
  verified: boolean;
  dkimEnabled: boolean;
  dkimStatus: string | null;
  dkimTokens: string[];
  mailFrom: {
    domain: string;
    behaviorOnMxFailure: 'USE_DEFAULT_VALUE' | 'REJECT_MESSAGE';
  } | null;
  tags: Record<string, string> | null;
}): HasReadonly<typeof DeclaredAwsSesEmailIdentity> => {
  return assure(
    DeclaredAwsSesEmailIdentity.as({
      identity: input.identity,
      dkim: input.dkimEnabled ? 'enabled' : 'disabled',
      mailFrom: input.mailFrom
        ? new DeclaredAwsSesMailFrom({
            domain: input.mailFrom.domain,
            behaviorOnMxFailure: input.mailFrom.behaviorOnMxFailure,
          })
        : null,
      tags: input.tags ? new DeclaredAwsTags(input.tags) : null,
      verificationStatus: input.verified ? 'verified' : 'unresolved',
      dkimTokens: input.dkimTokens,
      // a raw aws dkim-status fails loud if outside our modeled union; null passes through
      dkimStatus: input.dkimStatus
        ? isSesDkimStatus.assure(input.dkimStatus)
        : null,
    }),
    hasReadonly({ of: DeclaredAwsSesEmailIdentity }),
  );
};
