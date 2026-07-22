import { asProcedure } from 'as-procedure';
import type {
  HasReadonly,
  Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { describeOneParameter } from '@src/access/sdks/sdkSsm/describeOneParameter';
import { listOneParameterTags } from '@src/access/sdks/sdkSsm/listOneParameterTags';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsmParameterSecure } from '@src/domain.objects/DeclaredAwsSsmParameterSecure';
import { assertSsmParameterType } from '@src/domain.operations/ssmParameter/assertSsmParameterType';

import { asSsmParameterName } from './asSsmParameterName';
import { castIntoDeclaredAwsSsmParameterSecure } from './castIntoDeclaredAwsSsmParameterSecure';

/**
 * .what = gets a single secret SSM parameter's METADATA + tags from aws (never its value)
 * .why = write-only reconcile — uses DescribeParameters + ListTagsForResource (both metadata
 *   only), so NO GetParameter and NO kms:Decrypt is ever issued. mirrors getOneOrgSecret in
 *   declastruct-github; description + tags read back so those roundtrip fields converge to KEEP.
 *
 * .safety = SSM's name namespace is shared across types, so a Secure declared at a name that
 *   holds a String would otherwise be managed as a secret. we assert the live type IS
 *   'SecureString' and fail loud (BadRequestError) on any mismatch.
 */
export const getOneSsmParameterSecure = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSsmParameterSecure>;
        unique: RefByUnique<typeof DeclaredAwsSsmParameterSecure>;
        ref: Ref<typeof DeclaredAwsSsmParameterSecure>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSsmParameterSecure> | null> => {
    // derive the parameter name from the ref/unique/primary input
    const name = asSsmParameterName({ by: input.by });

    // describe the parameter metadata (NO value, NO decrypt)
    const found = await describeOneParameter({ name }, context);
    if (!found) return null;

    // fail loud if the live parameter is not a SecureString — never manage a plaintext String
    // as a secret (that seam would misroute a non-secret into the write-only flow)
    assertSsmParameterType({ found, expected: 'SecureString' });

    // read tags (ListTagsForResource — metadata only, no value) — a roundtrip field
    const tags = await listOneParameterTags({ name: found.name }, context);

    // cast to domain format (value stays undefined — write-only)
    return castIntoDeclaredAwsSsmParameterSecure({
      name: found.name,
      arn: found.arn,
      keyId: found.keyId,
      description: found.description,
      tags,
      version: found.version,
      lastModifiedAt: found.lastModifiedAt,
    });
  },
);
