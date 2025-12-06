import type { Organization } from '@aws-sdk/client-organizations';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure, isPresent } from 'type-fns';

import {
  DeclaredAwsOrganization,
  type OrganizationFeatureSet,
} from '../../domain.objects/DeclaredAwsOrganization';

/**
 * .what = transforms AWS SDK Organization to DeclaredAwsOrganization
 * .why = ensures type safety and readonly field enforcement
 * .note = AWS API uses legacy "MasterAccountId" but we map to "managementAccount"
 */
export const castIntoDeclaredAwsOrganization = (
  input: Organization,
): HasReadonly<typeof DeclaredAwsOrganization> => {
  return assure(
    DeclaredAwsOrganization.as({
      id: assure(input.Id, isPresent),
      arn: input.Arn,
      managementAccount: {
        id: assure(input.MasterAccountId, isPresent),
      },
      featureSet: input.FeatureSet as OrganizationFeatureSet,
    }),
    hasReadonly({ of: DeclaredAwsOrganization }),
  );
};
