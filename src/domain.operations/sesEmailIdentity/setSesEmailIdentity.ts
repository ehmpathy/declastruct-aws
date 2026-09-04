import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { createEmailIdentity } from '@src/access/sdks/sdkSesv2/createEmailIdentity';
import { putEmailIdentityDkim } from '@src/access/sdks/sdkSesv2/putEmailIdentityDkim';
import { putEmailIdentityMailFrom } from '@src/access/sdks/sdkSesv2/putEmailIdentityMailFrom';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesEmailIdentity } from '@src/domain.objects/DeclaredAwsSesEmailIdentity';

import { emitSesEmailIdentityDnsRecords } from './emitSesEmailIdentityDnsRecords';
import { emitSesEmailIdentityInboxVerification } from './emitSesEmailIdentityInboxVerification';
import { getOneSesEmailIdentity } from './getOneSesEmailIdentity';
import { isSesEmailIdentityEmail } from './isSesEmailIdentityEmail';
import { reconcileSesEmailIdentityTags } from './reconcileSesEmailIdentityTags';

/**
 * .what = creates or updates an SES email identity (findsert | upsert)
 * .why = enables declarative management of the mail domain, the send-from address, and the
 *   sandbox test recipient
 *
 * .idempotency
 *   - findsert on the FULL unique key (identity = the whole natural key): look up by
 *     identity, return the extant if present, else CreateEmailIdentity (itself a no-op on an
 *     already-owned identity). a re-run converges to KEEP.
 *   - dkim, mail-from, and tags reconcile independently on every upsert.
 */
export const setSesEmailIdentity = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSesEmailIdentity;
      upsert: DeclaredAwsSesEmailIdentity;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSesEmailIdentity>> => {
    const desired = input.findsert ?? input.upsert;

    // find the extant identity by unique value
    const foundBefore = await getOneSesEmailIdentity(
      { by: { unique: { identity: desired.identity } } },
      context,
    );

    // findsert: return the extant unchanged — but re-surface the dns records it still owes, so
    // a human who lost the first-run output recovers them on re-apply (KEEP is the only re-run
    // path, and it must not swallow the records the vision promises to hand over)
    if (foundBefore && input.findsert) {
      emitSesEmailIdentityDnsRecords(
        { identity: foundBefore, region: context.aws.credentials.region },
        context,
      );
      emitSesEmailIdentityInboxVerification({ identity: foundBefore }, context);
      return foundBefore;
    }

    // begin verification (a no-op if already ours); tags are set at create
    await createEmailIdentity(
      {
        identity: desired.identity,
        tags: desired.tags ? { ...desired.tags } : {},
      },
      context,
    );

    // dkim + mail-from are DOMAIN-level attributes. AWS rejects both on an email-address
    // identity (it inherits dkim from its parent domain and has no own mail-from — e.g. the
    // "Domain X is not verified for DKIM" reject). so gate both to a domain-valued identity;
    // an email identity skips straight to the read-back + inbox-click hand-off.
    const isEmail = isSesEmailIdentityEmail({ identity: desired });

    // converge the dkim state to the declared value (domain identities only)
    if (!isEmail)
      await putEmailIdentityDkim(
        { identity: desired.identity, enabled: desired.dkim === 'enabled' },
        context,
      );

    // converge the custom mail-from config (domain identities only; null clears it)
    if (!isEmail)
      await putEmailIdentityMailFrom(
        {
          identity: desired.identity,
          mailFrom: desired.mailFrom
            ? {
                domain: desired.mailFrom.domain,
                behaviorOnMxFailure: desired.mailFrom.behaviorOnMxFailure,
              }
            : null,
        },
        context,
      );

    // reconcile tags ONLY for an identity that pre-existed. createEmailIdentity sets the tags
    // inline on a fresh create (its Tags param is authoritative), so a create-path reconcile
    // would redundantly re-issue TagResource for tags already applied — a needless code path
    // and a needless call (rule.require.fewer-paths-via-idempotency). only when the identity
    // pre-existed does createEmailIdentity no-op (AlreadyExists) and leave tags unchanged, so
    // the reconcile is then what converges any tag drift on an upsert.
    if (foundBefore)
      await reconcileSesEmailIdentityTags(
        {
          identity: desired.identity,
          before: foundBefore.tags ? { ...foundBefore.tags } : null,
          desired: desired.tags ? { ...desired.tags } : null,
        },
        context,
      );

    // read back the written identity
    const foundAfter = await getOneSesEmailIdentity(
      { by: { unique: { identity: desired.identity } } },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('ses email identity not found after set', {
        desired,
      });

    // emit the copy-paste dns records the human owes for a domain identity — the vision's
    // "aha": apply hands over the ONE step declastruct cannot do (dns is a different provider)
    emitSesEmailIdentityDnsRecords(
      { identity: foundAfter, region: context.aws.credentials.region },
      context,
    );

    // and the inbox-click hand-off an EMAIL identity owes (a no-op for a domain identity) — the
    // twin manual step declastruct cannot do: AWS emails a confirm link the human must click
    emitSesEmailIdentityInboxVerification({ identity: foundAfter }, context);

    return foundAfter;
  },
);
