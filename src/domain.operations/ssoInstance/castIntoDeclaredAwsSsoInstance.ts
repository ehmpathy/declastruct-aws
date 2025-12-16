import type { InstanceMetadata } from '@aws-sdk/client-sso-admin';
import { isUniDateTime } from '@ehmpathy/uni-time';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import {
  DeclaredAwsSsoInstance,
  type SsoInstanceStatus,
} from '@src/domain.objects/DeclaredAwsSsoInstance';

/**
 * .what = transforms aws sdk InstanceMetadata to DeclaredAwsSsoInstance
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsSsoInstance = (
  response: InstanceMetadata,
): HasReadonly<typeof DeclaredAwsSsoInstance> => {
  // failfast if required fields are missing
  if (!response.InstanceArn)
    UnexpectedCodePathError.throw(
      'sso instance lacks arn; cannot cast to domain object',
      { response },
    );

  if (!response.IdentityStoreId)
    UnexpectedCodePathError.throw(
      'sso instance lacks identityStoreId; cannot cast to domain object',
      { response },
    );

  if (!response.OwnerAccountId)
    UnexpectedCodePathError.throw(
      'sso instance lacks ownerAccount; cannot cast to domain object',
      { response },
    );

  if (!response.Status)
    UnexpectedCodePathError.throw(
      'sso instance lacks status; cannot cast to domain object',
      { response },
    );

  if (!response.CreatedDate)
    UnexpectedCodePathError.throw(
      'sso instance lacks createdDate; cannot cast to domain object',
      { response },
    );

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsSsoInstance.as({
      arn: response.InstanceArn,
      identityStoreId: response.IdentityStoreId,
      ownerAccount: { id: response.OwnerAccountId },
      name: response.Name ?? null,
      status: response.Status as SsoInstanceStatus,
      statusReason: response.StatusReason ?? null,
      createdAt: isUniDateTime.assure(response.CreatedDate.toISOString()),
    }),
    hasReadonly({ of: DeclaredAwsSsoInstance }),
  );
};
