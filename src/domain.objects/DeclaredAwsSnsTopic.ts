import { DomainEntity } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a declarative structure that represents an AWS SNS Topic
 * .why = the event sink a SES configuration-set event destination publishes to
 *   (send/reject/bounce/complaint/delivery/open/click events), and the optional
 *   receive-notify target of a receipt rule's s3 action
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [name] — topic names are unique within an aws account+region
 *
 * .note
 *   - the arn is deterministic (`arn:aws:sns:<region>:<account>:<name>`) — SNS adds no
 *     random suffix — so the unique name resolves to the primary arn without a list scan
 *   - v1 models name + tags only; subscriptions + access policy are separate concerns,
 *     deferred until a real need appears (rule.prefer.wet-over-dry)
 */
export interface DeclaredAwsSnsTopic {
  /**
   * .what = the arn of the topic
   * .note = @metadata — assigned by aws
   */
  arn?: string;

  /**
   * .what = the name of the topic
   * .note = @unique
   * .example = 'svc-notifications-prep-ses-events'
   */
  name: string;

  /**
   * .what = the tags applied to the topic
   * .note = roundtrip read-write — read via ListTagsForResource, written via
   *   TagResource/UntagResource; null = no tags
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsSnsTopic
  extends DomainEntity<DeclaredAwsSnsTopic>
  implements DeclaredAwsSnsTopic
{
  /**
   * .what = arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = topic name is unique within the aws account+region
   */
  public static unique = ['name'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = intrinsic attributes resolved from aws, not user-settable
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    tags: DeclaredAwsTags,
  };
}
