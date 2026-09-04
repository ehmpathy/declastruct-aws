import { DomainEntity, RefByUnique } from 'domain-objects';
import { withAssure } from 'type-fns';

import type { DeclaredAwsSesConfigurationSet } from './DeclaredAwsSesConfigurationSet';
import { DeclaredAwsSesEventSink } from './DeclaredAwsSesEventSink';

/**
 * .what = the aws SES event types an event destination can route
 * .why = a closed union gives compile-time typo protection at every declaration site + symmetry
 *   with the other aws-enum fields in the family (mirrors SES v2's EventType)
 */
export const SES_EVENT_TYPES = [
  'SEND',
  'REJECT',
  'BOUNCE',
  'COMPLAINT',
  'DELIVERY',
  'OPEN',
  'CLICK',
  'RENDERING_FAILURE',
  'DELIVERY_DELAY',
  'SUBSCRIPTION',
] as const;

export type SesEventType = (typeof SES_EVENT_TYPES)[number];

/**
 * .what = guards a raw SES event-type string into the modeled union
 * .why = a value outside our union must fail loud at the read boundary (assure), not
 *   silently mistype (rule.require.assure-via-type-checks)
 */
export const isSesEventType = withAssure(
  (value: string): value is SesEventType =>
    (SES_EVENT_TYPES as readonly string[]).includes(value),
  { name: 'isSesEventType' },
);

/**
 * .what = casts a list of SES event types into its canonical (sorted) order
 * .why = declastruct compares fields order-sensitively, and the aws read-back is sorted, so the
 *   DECLARED value must be sorted too or a non-alphabetical declaration yields a perpetual UPDATE
 *   that never converges to KEEP (rule.require.guaranteed-idempotency). a canonical sort here — in
 *   the domain object's own construction — makes declaration order irrelevant for every consumer,
 *   rather than a per-consumer "declare alphabetically" convention that structurally protects
 *   no one (mirrors DeclaredAwsEc2LaunchTemplate's asCanonicalEc2InstanceMetadataOptions)
 */
export const asCanonicalSesEventTypes = (
  eventTypes: SesEventType[],
): SesEventType[] => [...eventTypes].sort();

/**
 * .what = an event destination on an SES configuration set
 * .why = routes chosen sent-mail events (send/reject/bounce/complaint/delivery/open/click) to
 *   a sink (CloudWatch or SNS) — the open + feedback capture the vision asks for
 *   (`AWS::SES::ConfigurationSetEventDestination`)
 *
 * .identity
 *   - @unique = [configurationSet, name] — a destination is identified by its set + its name
 *   - no @primary — an event destination has no arn of its own
 */
export interface DeclaredAwsSesConfigurationSetEventDestination {
  /**
   * .what = reference to the configuration set this destination is attached to
   * .note = @unique (with name)
   */
  configurationSet: RefByUnique<typeof DeclaredAwsSesConfigurationSet>;

  /**
   * .what = the event-destination name
   * .note = @unique (with configurationSet) — unique within the set
   */
  name: string;

  /**
   * .what = whether the destination is on (events flow) or off
   */
  enabled: boolean;

  /**
   * .what = the event types routed to the sink
   * .example = ['BOUNCE', 'COMPLAINT', 'DELIVERY', 'OPEN', 'SEND']
   * .note = declaration order does not matter — the construction sorts them to a canonical order
   *   (asCanonicalSesEventTypes) so the plan converges to KEEP regardless of the order declared
   */
  eventTypes: SesEventType[];

  /**
   * .what = the sink the events are delivered to (CloudWatch or SNS)
   */
  sink: DeclaredAwsSesEventSink;
}

export class DeclaredAwsSesConfigurationSetEventDestination
  extends DomainEntity<DeclaredAwsSesConfigurationSetEventDestination>
  implements DeclaredAwsSesConfigurationSetEventDestination
{
  /**
   * .what = sorts eventTypes into a canonical order on construction, so declaration order never
   *   drives a perpetual UPDATE
   * .why = declastruct compares fields order-sensitively against the sorted aws read-back, so the
   *   DECLARED value must also be sorted or a non-alphabetical declaration never converges to KEEP
   *   (rule.require.guaranteed-idempotency). the constructor is the single chokepoint BOTH the
   *   desired object (caller's `.as({...})`) and the read-back (castInto's `.as({...})`) pass
   *   through, so a sort here makes order irrelevant for every consumer — a convention comment in
   *   one dogfood file could not. the sort logic lives in domain.objects (not domain.operations),
   *   so this class stays within rule.require.directional-deps (mirrors DeclaredAwsEc2LaunchTemplate)
   */
  constructor(
    props: DeclaredAwsSesConfigurationSetEventDestination,
    options?: { skip?: { schema?: boolean } },
  ) {
    super(
      {
        ...props,
        eventTypes: asCanonicalSesEventTypes(props.eventTypes),
      },
      options,
    );
  }

  /**
   * .what = unique within the set, identified by the set ref + destination name
   * .note = an event destination has no arn, so no primary key
   */
  public static unique = ['configurationSet', 'name'] as const;

  /**
   * .what = no metadata — an event destination has no aws-assigned identity
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    configurationSet: RefByUnique<typeof DeclaredAwsSesConfigurationSet>,
    sink: DeclaredAwsSesEventSink,
  };
}
