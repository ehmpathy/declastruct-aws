import { DomainEntity, type Ref, RefByUnique } from 'domain-objects';

import type { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';

/**
 * .what = a declarative structure for EC2 instance lifecycle state
 * .why = enables declarative control of instance lifecycle (active/stopped/hibernated)
 *        separate from instance config to prevent accidental mutation
 */
export interface DeclaredAwsEc2InstanceSession {
  /**
   * .what = the instance this session controls
   * .note = is @unique -> one session per instance
   */
  instance: Ref<typeof DeclaredAwsEc2Instance>;

  /**
   * .what = the desired lifecycle status
   * .note = active = AWS 'running', stopped = AWS 'stopped', hibernated = AWS 'stopped' with hibernate
   */
  status: 'active' | 'stopped' | 'hibernated';
}

export class DeclaredAwsEc2InstanceSession
  extends DomainEntity<DeclaredAwsEc2InstanceSession>
  implements DeclaredAwsEc2InstanceSession
{
  public static unique = ['instance'] as const;

  /**
   * .what = identity attributes assigned by the persistence layer
   * .note = sessions have no external identity; identified by instance ref
   */
  public static metadata = [] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   * .note = sessions have no readonly fields - status is user-declared
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    instance: RefByUnique<typeof DeclaredAwsEc2Instance>,
  };
}
