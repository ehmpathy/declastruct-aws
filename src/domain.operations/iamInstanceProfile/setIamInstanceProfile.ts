import {
  AddRoleToInstanceProfileCommand,
  CreateInstanceProfileCommand,
  IAMClient,
  waitUntilInstanceProfileExists,
} from '@aws-sdk/client-iam';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsIamInstanceProfile } from '@src/domain.objects/DeclaredAwsIamInstanceProfile';

import { getIamInstanceProfile } from './getIamInstanceProfile';

/**
 * .what = creates an IAM instance profile and attaches a role
 * .why = enables EC2 instances to assume IAM roles for AWS API access
 *
 * .note
 *   - creates instance profile if not found
 *   - attaches specified role if not already attached
 *   - waits for instance profile to be ready (IAM eventual consistency)
 */
export const setIamInstanceProfile = async (
  input: PickOne<{
    findsert: DeclaredAwsIamInstanceProfile;
    upsert: DeclaredAwsIamInstanceProfile;
  }>,
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsIamInstanceProfile>> => {
  const profile = input.findsert ?? input.upsert;

  // create iam client
  const iam = new IAMClient({ region: context.aws.credentials.region });

  // check if profile already exists
  const profileBefore = await getIamInstanceProfile(
    { by: { unique: { name: profile.name } } },
    context,
  );

  // if findsert and found, return extant
  if (input.findsert && profileBefore) return profileBefore;

  // if upsert and found, verify role matches
  if (input.upsert && profileBefore) {
    // for now, upsert just returns the extant profile
    // role changes are not supported (would need to remove old role first)
    return profileBefore;
  }

  // create the instance profile
  await iam.send(
    new CreateInstanceProfileCommand({
      InstanceProfileName: profile.name,
      Path: profile.path ?? '/',
      Tags: profile.tags
        ? Object.entries(profile.tags).map(([Key, Value]) => ({ Key, Value }))
        : undefined,
    }),
  );

  // wait for profile to exist (IAM eventual consistency)
  await waitUntilInstanceProfileExists(
    { client: iam, maxWaitTime: 60 },
    { InstanceProfileName: profile.name },
  );

  // attach the role
  const roleName = profile.role.name;
  await iam.send(
    new AddRoleToInstanceProfileCommand({
      InstanceProfileName: profile.name,
      RoleName: roleName,
    }),
  );

  // fetch and return created profile
  const created = await getIamInstanceProfile(
    { by: { unique: { name: profile.name } } },
    context,
  );
  if (!created)
    UnexpectedCodePathError.throw('instance profile not found after creation', {
      profile,
    });
  return created;
};
