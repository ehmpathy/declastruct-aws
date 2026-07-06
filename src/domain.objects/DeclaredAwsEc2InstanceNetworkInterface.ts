import { DomainLiteral } from 'domain-objects';

/**
 * .what = the primary elastic network interface (eni) config of an ec2 instance
 * .why = groups settable nic attributes under one network.interface bucket
 * .note
 *   - these are general ec2 nic attributes, not nat-specific
 *   - a nat instance sets publicIpEnabled=true (egress) and
 *     sourceDestChecked=false (forward traffic that is not its own)
 */
export interface DeclaredAwsEc2InstanceNetworkInterface {
  /**
   * .what = whether aws assigns a public ipv4 to the primary nic at launch
   * .why = a nat must have a public ip to reach the internet
   */
  publicIpEnabled: boolean;

  /**
   * .what = whether the nic drops packets whose source/dest is not the instance
   * .why = aws default (true) blocks spoofed source addresses; a nat must set
   *        false so it can forward traffic on behalf of other instances
   */
  sourceDestChecked: boolean;

  /**
   * .what = the private ipv4 address aws assigned to the nic
   * .note = @readonly (declared on the entity via dot-path) -> resolved from aws
   */
  privateIp?: string;

  /**
   * .what = the public ipv4 address aws assigned to the nic
   * .note = @readonly (declared on the entity via dot-path) -> resolved from aws;
   *         null when publicIpEnabled is false (no public ip assigned)
   */
  publicIp?: string | null;
}

export class DeclaredAwsEc2InstanceNetworkInterface
  extends DomainLiteral<DeclaredAwsEc2InstanceNetworkInterface>
  implements DeclaredAwsEc2InstanceNetworkInterface {}
