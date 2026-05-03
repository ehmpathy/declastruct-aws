import type { Organization } from '@aws-sdk/client-organizations';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure, isPresent } from 'type-fns';

import {
  DeclaredAwsOrganization,
  type OrganizationFeatureSet,
} from '@src/domain.objects/DeclaredAwsOrganization';

/**
 * .what = transforms AWS SDK Organization to DeclaredAwsOrganization
 * .why = ensures type safety and readonly field enforcement
 * .note
 *   - AWS API uses legacy "MasterAccountId" but we map to "managementAccount"
 *   - rootId is passed separately (requires ListRoots call)
 */
export const castIntoDeclaredAwsOrganization = (input: {
  organization: Organization;
  rootId: string;
}): HasReadonly<typeof DeclaredAwsOrganization> => {
  return assure(
    DeclaredAwsOrganization.as({
      id: assure(input.organization.Id, isPresent),
      arn: input.organization.Arn,
      rootId: input.rootId,
      managementAccount: {
        id: assure(input.organization.MasterAccountId, isPresent),
      },
      featureSet: input.organization.FeatureSet as OrganizationFeatureSet,
    }),
    hasReadonly({ of: DeclaredAwsOrganization }),
  );
};
