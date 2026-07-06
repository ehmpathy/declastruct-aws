import { DomainEntity, RefByUnique } from 'domain-objects';

import type { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';

/**
 * .what = a declarative structure for an SSH public key authorized on an EC2 instance
 * .why = enables declarative control of durable SSH key authorization — the key is
 *        appended to the login user's ~/.ssh/authorized_keys on the instance's EBS
 *        disk (via an SSM shell command), so it survives stop/start and hibernate
 */
export interface DeclaredAwsEc2SshKeyAuthorized {
  /**
   * .what = the instance this key is authorized on
   */
  instance: RefByUnique<typeof DeclaredAwsEc2Instance>;

  /**
   * .what = the SSH public key
   * .note = the full public key string (e.g., 'ssh-ed25519 AAAA... comment')
   */
  publicKey: string;

  /**
   * .what = the comment from the public key
   * .note = is @unique with instance -> one key per comment per instance
   */
  comment: string;

  /**
   * .what = the OS login user whose ~/.ssh/authorized_keys the key is appended to
   * .note = e.g. 'ec2-user' on Amazon Linux, 'ubuntu' on Ubuntu AMIs
   */
  user: string;

  /**
   * .what = the fingerprint of the public key
   * .note = is @readonly -> computed from publicKey
   */
  fingerprint?: string;

  /**
   * .what = when the key was authorized
   * .note = is @readonly -> set on authorization
   */
  authorizedAt?: string;
}

export class DeclaredAwsEc2SshKeyAuthorized
  extends DomainEntity<DeclaredAwsEc2SshKeyAuthorized>
  implements DeclaredAwsEc2SshKeyAuthorized
{
  public static unique = ['instance', 'comment'] as const;

  /**
   * .what = identity attributes assigned by the system
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved at runtime, not user-settable
   */
  public static readonly = ['fingerprint', 'authorizedAt'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    instance: RefByUnique<typeof DeclaredAwsEc2Instance>,
  };
}
