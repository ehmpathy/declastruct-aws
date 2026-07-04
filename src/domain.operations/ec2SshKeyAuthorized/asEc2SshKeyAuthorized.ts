import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';

/**
 * .what = casts SSM parameter data to DeclaredAwsEc2SshKeyAuthorized
 * .why = transforms SSM cache format to domain object for orchestrator use
 */
export const asEc2SshKeyAuthorized = (input: {
  instanceExid: string;
  paramValue: string;
}): HasReadonly<typeof DeclaredAwsEc2SshKeyAuthorized> => {
  // parse stored JSON from SSM parameter
  // format: { publicKey, fingerprint, authorizedAt, comment, user }
  const data = JSON.parse(input.paramValue) as {
    publicKey: string;
    fingerprint: string;
    authorizedAt: string;
    comment: string;
    user?: string;
  };

  // return domain object with readonly fields
  // note: params written before `user` existed lack it; default to ec2-user so
  //   those legacy authorizations still read back (external-data boundary)
  return assure(
    DeclaredAwsEc2SshKeyAuthorized.as({
      instance: { exid: input.instanceExid },
      publicKey: data.publicKey,
      comment: data.comment,
      user: data.user ?? 'ec2-user',
      fingerprint: data.fingerprint,
      authorizedAt: data.authorizedAt,
    }),
    hasReadonly({ of: DeclaredAwsEc2SshKeyAuthorized }),
  );
};
