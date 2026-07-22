import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { setParameter } from '@src/access/sdks/sdkSsm/setParameter';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsmParameterSecure } from '@src/domain.objects/DeclaredAwsSsmParameterSecure';
import { reconcileSsmParameterTags } from '@src/domain.operations/ssmParameter/reconcileSsmParameterTags';

import { getOneSsmParameterSecure } from './getOneSsmParameterSecure';

/**
 * .what = creates or rotates a secret SSM parameter (type=SecureString)
 * .why = enables declarative management of secrets; replicates declastruct-github's
 *   write-only setOrgSecret.
 *
 * WRITE-ONLY PATTERN:
 *   - if value is undefined and the secret exists: keep it unchanged (no-op)
 *   - if value is undefined and the secret is absent: throw (a value is required to create)
 *   - if value is provided: create/rotate with the new value
 *
 * .idempotency
 *   - this is a findsert on the FULL unique key (name = the whole natural identity, not a
 *     subset), the #1 mechanism in rule.require.guaranteed-idempotency: look up by the unique
 *     key, create only if absent. the metadata read is ALSO required by the write-only guard
 *     (create-without-value must know existence WITHOUT a read of the value). a sequential
 *     re-run converges — findsert returns the extant (KEEP), upsert re-writes. PutParameter is
 *     atomic.
 *   - declastruct applies resources SEQUENTIALLY in declared array order (no concurrent apply
 *     of the same parameter), so the read-then-write is not exposed to a concurrent writer.
 *     mirrors declastruct-github's setOrgSecret, which uses the same findsert shape.
 *
 * .concurrency = this is exported directly as a public SDK op, but its read-then-write is only
 *   race-free under declastruct's SEQUENTIAL apply. it is NOT safe for concurrent invocation on
 *   the SAME parameter name outside that sequential call path — two callers in a race could both
 *   read "absent" and both create. drive it through plan/apply, not a parallel fan-out.
 */
export const setSsmParameterSecure = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSsmParameterSecure;
      upsert: DeclaredAwsSsmParameterSecure;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSsmParameterSecure>> => {
    const desired = input.findsert ?? input.upsert;

    // check if the secret already exists (metadata only — never reads the value)
    const before = await getOneSsmParameterSecure(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: if found, return it unchanged (no-op)
    if (before && input.findsert) return before;

    // if no value provided and the secret is absent, cannot create
    if (desired.value === undefined && !before)
      BadRequestError.throw(
        'cannot create a secret parameter without a value. provide the value via process.env or directly.',
        { name: desired.name },
      );

    // aws re-encrypts a SecureString ONLY on a value write (PutParameter needs the value), so a
    // change to keyId or description with no value would be a silent plan/apply divergence
    // (plan sees UPDATE, apply could not honor it). fail loud instead — the caller must provide
    // a value to rotate the key or change the description.
    if (desired.value === undefined && before) {
      const keyIdChanged = (desired.keyId ?? null) !== (before.keyId ?? null);
      const descriptionChanged =
        (desired.description ?? null) !== (before.description ?? null);
      if (keyIdChanged || descriptionChanged)
        BadRequestError.throw(
          'cannot change the keyId or description of a secret without also a value write (aws re-encrypts a SecureString only on a value write). provide the value to rotate.',
          { name: desired.name },
        );
    }

    // write the secret value + description + keyId when a value is provided (create or rotate).
    // pass '' (not undefined) for a null description: aws RETAINS the prior description when
    // Description is OMITTED on a PutParameter Overwrite, so `?? undefined` would never clear it
    // (permanent non-convergence). an empty-string Description clears it; the read-back cast folds
    // '' back to null so a declared `null` converges to KEEP.
    if (desired.value !== undefined)
      await setParameter(
        {
          name: desired.name,
          value: desired.value,
          type: 'SecureString',
          description: desired.description ?? '',
          keyId: desired.keyId ?? undefined,
          overwrite: true,
        },
        context,
      );

    // reconcile tags — independent of the value (AddTagsToResource needs no value, so this is
    // safe for a SecureString even when the value is left unchanged). shared with the Plain
    // variant via reconcileSsmParameterTags.
    await reconcileSsmParameterTags(
      {
        name: desired.name,
        before: before?.tags ?? null,
        desired: desired.tags,
      },
      context,
    );

    // fetch and return the reconciled secret's metadata
    const after = await getOneSsmParameterSecure(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // failfast if not found after set
    if (!after)
      UnexpectedCodePathError.throw('secret parameter not found after set', {
        name: desired.name,
      });

    return after;
  },
);
