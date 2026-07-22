import { isUniDateTime } from '@ehmpathy/uni-time';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsSsmParameterSecure } from '@src/domain.objects/DeclaredAwsSsmParameterSecure';
import { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = the alias aws reports for the account default SSM key
 * .why = a SecureString with no customer key reads back `KeyId: 'alias/aws/ssm'`, but a declared
 *   `keyId: null` means "use that default key" — so we map this alias to null to converge to KEEP
 */
const SSM_DEFAULT_KEY_ALIAS = 'alias/aws/ssm';

/**
 * .what = transforms SSM parameter METADATA (DescribeParameters) + tags (ListTagsForResource)
 *   into DeclaredAwsSsmParameterSecure
 * .why = the value is write-only — it is NEVER read back, so `value` is left undefined here,
 *   exactly like castToDeclaredGithubOrgSecret. drift on the value is intentionally undetected.
 *   description + tags come from metadata-only calls, so the no-GetParameter/no-decrypt
 *   guarantee holds while the roundtrip fields still converge to KEEP.
 */
export const castIntoDeclaredAwsSsmParameterSecure = (input: {
  name: string;
  arn: string;
  keyId: string | null;
  description: string | null;
  tags: Record<string, string> | null;
  version: number;
  lastModifiedAt: string;
}): HasReadonly<typeof DeclaredAwsSsmParameterSecure> => {
  // map the account default key alias to null so a declared `keyId: null`
  // (which means "use the account default aws/ssm key") converges to KEEP — aws reports
  // the default key as the alias, not null, so a raw passthrough would perma-diff
  const keyId = input.keyId === SSM_DEFAULT_KEY_ALIAS ? null : input.keyId;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsSsmParameterSecure.as({
      arn: input.arn,
      name: input.name,
      // value is NEVER returned from aws — secrets are write-only
      value: undefined,
      keyId,
      description: input.description,
      tags: input.tags ? new DeclaredAwsTags(input.tags) : null,
      version: input.version,
      lastModifiedAt: isUniDateTime.assure(input.lastModifiedAt),
    }),
    hasReadonly({ of: DeclaredAwsSsmParameterSecure }),
  );
};
