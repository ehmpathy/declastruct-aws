import { DomainLiteral, type Ref, RefByUnique } from 'domain-objects';

import type { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';

/**
 * .what = route target that points at a NAT instance (fck-nat)
 * .why = lets a private route table send egress through a declared NAT instance,
 *        referenced by identity so declastruct resolves the AWS id at apply time
 */
export interface DeclaredAwsVpcRouteTargetNatInstance {
  /**
   * .what = ref to the NAT instance, by unique exid or primary id
   * .note = the cast resolves the AWS instance id back to its exid, so a declared
   *         ref and the remote route compare equal (no false drift)
   */
  instance: Ref<typeof DeclaredAwsEc2Instance>;
}

export class DeclaredAwsVpcRouteTargetNatInstance
  extends DomainLiteral<DeclaredAwsVpcRouteTargetNatInstance>
  implements DeclaredAwsVpcRouteTargetNatInstance
{
  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    instance: RefByUnique<typeof DeclaredAwsEc2Instance>,
  };
}
