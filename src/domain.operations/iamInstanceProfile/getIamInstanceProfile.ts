import { GetInstanceProfileCommand, IAMClient } from '@aws-sdk/client-iam';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamInstanceProfile } from '@src/domain.objects/DeclaredAwsIamInstanceProfile';

/**
 * .what = gets an IAM instance profile by name
 * .why = enables lookup of instance profiles for EC2 instances
 */
export const getIamInstanceProfile = async (
  input: {
    by: PickOne<{
      unique: { name: string };
    }>;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsIamInstanceProfile> | null> => {
  // failfast if no lookup key provided
  if (!input.by.unique)
    UnexpectedCodePathError.throw('by.unique is required', { input });

  // create iam client
  const iam = new IAMClient({ region: context.aws.credentials.region });

  // fetch instance profile
  try {
    const response = await iam.send(
      new GetInstanceProfileCommand({
        InstanceProfileName: input.by.unique.name,
      }),
    );

    const profile = response.InstanceProfile;
    if (!profile) return null;

    // extract role reference if attached
    const roles = profile.Roles ?? [];
    if (roles.length === 0) return null; // profile exists but no role attached

    const role = roles[0];
    if (!role?.RoleName)
      UnexpectedCodePathError.throw('instance profile role has no name', {
        profile,
      });

    // extract tags
    const tags = profile.Tags?.reduce(
      (acc, tag) => {
        if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return DeclaredAwsIamInstanceProfile.as({
      name: profile.InstanceProfileName!,
      role: { name: role.RoleName },
      path: profile.Path,
      tags: tags && Object.keys(tags).length > 0 ? tags : null,
    }) as HasReadonly<typeof DeclaredAwsIamInstanceProfile>;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.name === 'NoSuchEntityException') return null;
    throw error;
  }
};
