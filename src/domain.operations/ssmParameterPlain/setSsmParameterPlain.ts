import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { setParameter } from '@src/access/sdks/sdkSsm/setParameter';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsmParameterPlain } from '@src/domain.objects/DeclaredAwsSsmParameterPlain';
import { reconcileSsmParameterTags } from '@src/domain.operations/ssmParameter/reconcileSsmParameterTags';

import { getOneSsmParameterPlain } from './getOneSsmParameterPlain';

/**
 * .what = creates or updates a plaintext SSM parameter (type=String)
 * .why = enables declarative management of non-secret config
 *
 * .note
 *   - findsert: creates if absent, returns foundBefore if present
 *   - upsert: creates if absent, overwrites the value if present
 *
 * .idempotency
 *   - this is a findsert on the FULL unique key (name = the whole natural identity, not a
 *     subset), the #1 mechanism in rule.require.guaranteed-idempotency: look up by the unique
 *     key, create only if absent. a sequential re-run converges — findsert returns the extant
 *     (KEEP), upsert re-writes the identical value (no drift). PutParameter itself is atomic.
 *   - declastruct applies resources SEQUENTIALLY in declared array order (no concurrent apply
 *     of the same parameter), so the read-then-write is not exposed to a concurrent writer.
 *     mirrors declastruct-github's setOrgSecret, which uses the same findsert shape.
 *
 * .concurrency = this is exported directly as a public SDK op, but its read-then-write is only
 *   race-free under declastruct's SEQUENTIAL apply. it is NOT safe for concurrent invocation on
 *   the SAME parameter name outside that sequential call path. drive it through plan/apply.
 */
export const setSsmParameterPlain = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSsmParameterPlain;
      upsert: DeclaredAwsSsmParameterPlain;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSsmParameterPlain>> => {
    const desired = input.findsert ?? input.upsert;

    // check if the parameter already exists
    const foundBefore = await getOneSsmParameterPlain(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: if found, return it unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // write the value + description ONLY when they actually changed — AWS bumps Version +
    // LastModifiedDate on EVERY PutParameter regardless of whether the value changed, so an
    // unconditional write would churn the version history on a tags-only diff (tags reconcile
    // independently below). mirrors the Secure variant's value-changed guard.
    const valueChanged = !foundBefore || foundBefore.value !== desired.value;
    const descriptionChanged =
      (foundBefore?.description ?? null) !== (desired.description ?? null);
    // pass '' (not undefined) for a null description: aws RETAINS the prior description when
    // Description is OMITTED on a PutParameter Overwrite, so `?? undefined` would never clear it
    // (permanent non-convergence). an empty-string Description clears it; the read-back cast folds
    // '' back to null so a declared `null` converges to KEEP.
    if (valueChanged || descriptionChanged)
      await setParameter(
        {
          name: desired.name,
          value: desired.value,
          type: 'String',
          description: desired.description ?? '',
          overwrite: true,
        },
        context,
      );

    // reconcile tags — they cannot ride a PutParameter Overwrite, so add/remove separately
    // (shared with the Secure variant via reconcileSsmParameterTags)
    await reconcileSsmParameterTags(
      {
        name: desired.name,
        before: foundBefore?.tags ?? null,
        desired: desired.tags,
      },
      context,
    );

    // fetch and return the written parameter
    const foundAfter = await getOneSsmParameterPlain(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // failfast if not found after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('parameter not found after set', {
        desired,
      });

    return foundAfter;
  },
);
