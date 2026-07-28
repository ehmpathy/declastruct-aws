import { DomainEntity, RefByUnique } from 'domain-objects';

import {
  asCanonicalEc2InstanceMetadataOptions,
  DeclaredAwsEc2InstanceMetadataOptions,
} from './DeclaredAwsEc2InstanceMetadataOptions';
import type { DeclaredAwsIamInstanceProfile } from './DeclaredAwsIamInstanceProfile';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a declarative structure representing an AWS EC2 launch template
 * .why = enables declarative control of EC2 instance configuration (what the machine is)
 */
export interface DeclaredAwsEc2LaunchTemplate {
  /**
   * .what = the launch template id
   * .note = is @metadata -> identity assigned by AWS
   */
  id?: string;

  /**
   * .what = the external id tag for declarative reference
   * .note = used for RefByUnique lookup
   */
  exid: string;

  /**
   * .what = the instance type
   * .note = e.g., 't3.medium', 't3.large'
   */
  instanceType: string;

  /**
   * .what = the AMI image id
   * .note = e.g., 'ami-0abcd1234567890ef'
   */
  imageId: string;

  /**
   * .what = whether hibernation is enabled
   * .note = requires rootVolumeEncrypted: true
   */
  hibernation: boolean;

  /**
   * .what = the root volume size in GiB
   */
  rootVolumeSize: number;

  /**
   * .what = whether the root volume is encrypted
   * .note = required for hibernation
   */
  rootVolumeEncrypted: boolean;

  /**
   * .what = reference to the IAM instance profile
   * .note = null if no profile
   */
  iamInstanceProfile: RefByUnique<typeof DeclaredAwsIamInstanceProfile> | null;

  /**
   * .what = user data (base64-encoded)
   * .note = null if no user data
   */
  userData: string | null;

  /**
   * .what = the imdsv2 instance-metadata-service controls for boxes launched from
   *   this template
   * .note = null is secure-by-default -> the template is created imdsv2-only
   *   (httpTokens=required, httpPutResponseHopLimit=1, httpEndpoint=enabled); a
   *   caller sets an explicit value to opt out (httpTokens=optional) or to raise
   *   the hop limit for docker/containers (httpPutResponseHopLimit=2)
   * .note = this is the ONE field that does NOT round-trip verbatim: a value equal
   *   to the secure default (incl. the literal { required, 1, enabled } or the
   *   exported ec2InstanceMetadataOptionsSecure) canonicalizes to null at
   *   construction, so `template.metadataOptions` reads back null for a secure
   *   declaration. this is deliberate — null is the ONE canonical secure form, so a
   *   secure box converges to KEEP however it was declared (see the constructor +
   *   asCanonicalEc2InstanceMetadataOptions). a non-default value (opt-out, raised
   *   hop) is preserved verbatim
   */
  metadataOptions: DeclaredAwsEc2InstanceMetadataOptions | null;

  /**
   * .what = AWS tags
   * .note = null defaults to exid tag only
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsEc2LaunchTemplate
  extends DomainEntity<DeclaredAwsEc2LaunchTemplate>
  implements DeclaredAwsEc2LaunchTemplate
{
  /**
   * .what = canonicalizes metadataOptions at construction, so a secure-equal value
   *   (or null) always reduces to the SAME null
   * .why = declastruct decides KEEP via serialize(desired) === serialize(remote). the
   *   DESIRED side is the caller's object verbatim (never round-tripped through the
   *   cast), so a caller who declares the literal secure values would otherwise never
   *   serialize-equal a secure box read back as null -> UPDATE forever -> the immutable
   *   throw on every re-apply. by canonicalizing here, BOTH the caller's object AND the
   *   cast's read-back (the cast also builds via this constructor) collapse a secure
   *   value to null, so a secure box converges to KEEP however it was declared
   *   (rule.require.guaranteed-idempotency). enforced at construction because it is a
   *   domain invariant of this resource, not a per-call-site concern
   * .note = this is a DELIBERATE exception to the repo's "zero constructor overrides"
   *   convention (howto.domain-objects-nested-unions.md). it is structurally forced,
   *   not a shortcut: the canonicalizer must run on the DESIRED side, but that side is
   *   the caller's raw object (declastruct never round-trips it through the cast), so
   *   the constructor is the only chokepoint both desired and read-back pass through. it
   *   cannot move to a transformer the caller invokes (a caller would forget it) nor to
   *   a schema .transform (domain-objects discards the parsed result). the collapse
   *   logic itself lives in domain.objects (not domain.operations) so this class imports
   *   it within the bounds of rule.require.directional-deps
   */
  constructor(
    props: DeclaredAwsEc2LaunchTemplate,
    options?: { skip?: { schema?: boolean } },
  ) {
    super(
      {
        ...props,
        metadataOptions: asCanonicalEc2InstanceMetadataOptions(
          props.metadataOptions ?? null,
        ),
      },
      options,
    );
  }

  public static primary = ['id'] as const;
  public static unique = ['exid'] as const;

  /**
   * .what = identity attributes assigned by the persistence layer
   * .note = describes the entity for persistence purposes, not intrinsic attributes
   */
  public static metadata = ['id'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   * .note = launch templates have no readonly fields - all config is user-set
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    iamInstanceProfile: RefByUnique<typeof DeclaredAwsIamInstanceProfile>,
    metadataOptions: DeclaredAwsEc2InstanceMetadataOptions,
    tags: DeclaredAwsTags,
  };
}
