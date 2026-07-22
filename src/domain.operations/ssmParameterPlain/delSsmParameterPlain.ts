import { asProcedure } from 'as-procedure';
import type { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { delParameter } from '@src/access/sdks/sdkSsm/delParameter';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsmParameterPlain } from '@src/domain.objects/DeclaredAwsSsmParameterPlain';

import { getOneSsmParameterPlain } from './getOneSsmParameterPlain';

/**
 * .what = deletes a plaintext SSM parameter by unique (name), primary (arn), or ref
 * .why = enables declarative destroy of a plaintext config param; idempotent (a no-op if
 *   already absent). the Secure peer already ships this; symmetry keeps the two variants
 *   drivable the same way (rule.require.symmetry-with-peer-resources)
 *
 * .safety = declastruct's apply can run long after plan (plan captures the remote state, a
 *   separate apply invocation destroys it later). if the name is repurposed out-of-band between
 *   plan and apply (deleted + recreated as a SecureString by another tool), a bare delete would
 *   destroy whatever now lives there with no re-check. so we route the destroy through the
 *   type-checked get first — it fails loud (BadRequestError) if the live type is not a String —
 *   before any delete can be reached. this mirrors the same guard get/set/del carry
 *   (rule.forbid.silent-resource-theft, rule.require.immutable-source-of-truth).
 */
export const delSsmParameterPlain = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSsmParameterPlain>;
        unique: RefByUnique<typeof DeclaredAwsSsmParameterPlain>;
        ref: Ref<typeof DeclaredAwsSsmParameterPlain>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // verify the live type IS a String before any destroy (fails loud on a mismatch);
    // returns null when already absent, so the destroy stays idempotent. the resolved name comes
    // back on `before`, so no separate name derivation is needed here.
    const before = await getOneSsmParameterPlain({ by: input.by }, context);
    if (!before) return;

    // delete the parameter (idempotent — a no-op if already absent)
    await delParameter({ name: before.name }, context);
  },
);
