import type {
  AttachedManagedPolicy,
  PermissionSet,
  Tag,
} from '@aws-sdk/client-sso-admin';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsIamPolicyBundle } from '../../domain.objects/DeclaredAwsIamPolicyBundle';
import type { DeclaredAwsSsoInstance } from '../../domain.objects/DeclaredAwsSsoInstance';
import { DeclaredAwsSsoPermissionSet } from '../../domain.objects/DeclaredAwsSsoPermissionSet';
import { castIntoDeclaredAwsIamPolicyDocument } from '../iamPolicyDocument/castIntoDeclaredAwsIamPolicyDocument';
import { castIntoDeclaredAwsTags } from '../tags/castIntoDeclaredAwsTags';

/**
 * .what = parses AWS managed policies to domain format
 */
const castIntoManagedPolicyArns = (
  managedPolicies: AttachedManagedPolicy[] | undefined,
): string[] => managedPolicies?.map((p) => p.Arn ?? '').filter(Boolean) ?? [];

/**
 * .what = transforms aws sdk PermissionSet to DeclaredAwsSsoPermissionSet
 * .why = ensures type safety and readonly field enforcement
 *
 * .note = accepts raw AWS responses and performs all necessary casting internally
 */
export const castIntoDeclaredAwsSsoPermissionSet = (input: {
  response: PermissionSet;
  instance: RefByUnique<typeof DeclaredAwsSsoInstance>;
  managedPolicies?: AttachedManagedPolicy[];
  inlinePolicy?: string;
  tags?: Tag[];
}): HasReadonly<typeof DeclaredAwsSsoPermissionSet> => {
  const { response, instance, managedPolicies, inlinePolicy, tags } = input;

  // failfast if required fields are missing
  if (!response.PermissionSetArn)
    UnexpectedCodePathError.throw(
      'permission set lacks arn; cannot cast to domain object',
      { response },
    );

  if (!response.Name)
    UnexpectedCodePathError.throw(
      'permission set lacks name; cannot cast to domain object',
      { response },
    );

  // build policy bundle from raw AWS responses
  const policy = new DeclaredAwsIamPolicyBundle({
    managed: castIntoManagedPolicyArns(managedPolicies),
    inline: castIntoDeclaredAwsIamPolicyDocument(inlinePolicy),
  });

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsSsoPermissionSet.as({
      arn: response.PermissionSetArn,
      instance,
      name: response.Name,
      description: response.Description ?? null,
      sessionDuration: response.SessionDuration,
      policy,
      tags: castIntoDeclaredAwsTags(tags),
    }),
    hasReadonly({ of: DeclaredAwsSsoPermissionSet }),
  );
};
