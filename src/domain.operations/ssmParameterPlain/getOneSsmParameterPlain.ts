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
import { getOneParameter } from '@src/access/sdks/sdkSsm/getOneParameter';
import { listOneParameterTags } from '@src/access/sdks/sdkSsm/listOneParameterTags';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsmParameterPlain } from '@src/domain.objects/DeclaredAwsSsmParameterPlain';
import { assertSsmParameterType } from '@src/domain.operations/ssmParameter/assertSsmParameterType';

import { asSsmParameterIdentifier } from './asSsmParameterIdentifier';
import { castIntoDeclaredAwsSsmParameterPlain } from './castIntoDeclaredAwsSsmParameterPlain';

/**
 * .what = gets a single plaintext SSM parameter from aws (value-compare read)
 * .why = enables lookup by primary (arn) or unique (name); reads the live value via
 *   GetParameter (no kms:Decrypt needed for a String) so drift is detected by value;
 *   description via DescribeParameters and tags via ListTagsForResource so those roundtrip
 *   fields converge to KEEP.
 *
 * .safety = AWS SSM shares ONE global namespace across String/StringList/SecureString, so a
 *   Plain declared at a name that already holds a SecureString would otherwise read the
 *   ciphertext blob as `Value` and let a later write DOWNGRADE the secret to a plaintext
 *   String. so we assert the live type IS 'String' and fail loud (BadRequestError) on any
 *   mismatch — before any write path can be reached.
 */
export const getOneSsmParameterPlain = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSsmParameterPlain>;
        unique: RefByUnique<typeof DeclaredAwsSsmParameterPlain>;
        ref: Ref<typeof DeclaredAwsSsmParameterPlain>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsSsmParameterPlain> | null> => {
    // derive the GetParameter identifier from the ref/unique/primary input
    const identifier = asSsmParameterIdentifier({ by: input.by });

    // read the parameter (no decryption — plaintext String)
    const found = await getOneParameter(
      { name: identifier, withDecryption: false },
      context,
    );
    if (!found) return null;

    // fail loud if the live parameter is not a String — never treat a SecureString as Plain
    // (that seam would leak ciphertext into the plan and enable a silent secret downgrade)
    assertSsmParameterType({ found, expected: 'String' });

    // read description (DescribeParameters) + tags (ListTagsForResource) — roundtrip fields.
    // these two reads have no data dependency on each other, so run them in parallel to shave a
    // round trip off every plan-time read
    const [metadata, tags] = await Promise.all([
      describeOneParameter({ name: found.name }, context),
      listOneParameterTags({ name: found.name }, context),
    ]);

    // cast to domain format
    return castIntoDeclaredAwsSsmParameterPlain({
      name: found.name,
      value: found.value,
      arn: found.arn,
      description: metadata?.description ?? null,
      tags,
      version: found.version,
      lastModifiedAt: found.lastModifiedAt,
    });
  },
);
