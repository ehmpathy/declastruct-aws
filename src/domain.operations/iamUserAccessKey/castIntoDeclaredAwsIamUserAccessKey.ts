import type { AccessKeyLastUsed, AccessKeyMetadata } from '@aws-sdk/client-iam';
import { isUniDateTime } from '@ehmpathy/uni-time';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { assure, isPresent } from 'type-fns';

import type { DeclaredAwsIamUser } from '../../domain.objects/DeclaredAwsIamUser';
import {
  DeclaredAwsIamUserAccessKey,
  type IamAccessKeyStatus,
} from '../../domain.objects/DeclaredAwsIamUserAccessKey';

/**
 * .what = transforms AWS SDK AccessKeyMetadata into DeclaredAwsIamUserAccessKey
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsIamUserAccessKey = (input: {
  accessKey: AccessKeyMetadata;
  user: RefByUnique<typeof DeclaredAwsIamUser>;
  lastUsed?: AccessKeyLastUsed;
}): HasReadonly<typeof DeclaredAwsIamUserAccessKey> => {
  // parse createDate (required readonly)
  const createDate = isUniDateTime.assure(
    assure(input.accessKey.CreateDate, isPresent).toISOString(),
  );

  // parse lastUsedDate (nullable readonly - key may never have been used)
  const lastUsedDate = input.lastUsed?.LastUsedDate
    ? isUniDateTime.assure(input.lastUsed.LastUsedDate.toISOString())
    : null;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsIamUserAccessKey.as({
      accessKeyId: assure(input.accessKey.AccessKeyId, isPresent),
      user: input.user,
      status: assure(input.accessKey.Status, isPresent) as IamAccessKeyStatus,
      createDate,
      lastUsedDate,
      lastUsedService: input.lastUsed?.ServiceName ?? null,
      lastUsedRegion: input.lastUsed?.Region ?? null,
    }),
    hasReadonly({ of: DeclaredAwsIamUserAccessKey }),
  );
};
