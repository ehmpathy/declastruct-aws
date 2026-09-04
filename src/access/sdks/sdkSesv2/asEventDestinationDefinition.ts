import type {
  DimensionValueSource,
  EventDestinationDefinition,
  EventType,
} from '@aws-sdk/client-sesv2';

/**
 * .what = builds the aws EventDestinationDefinition from a friendly sink input
 * .why = keeps the aws sdk shape at the boundary; the create + update wrappers share one
 *   builder so a cloudwatch OR sns sink is expressed the same way in both
 * .note = the two `as` casts below are the SANCTIONED external-sdk-boundary casts
 *   (rule.forbid.as-cast exempts casts at a third-party sdk boundary). our domain carries the
 *   friendly `string` / `string[]` shapes; the AWS sdk types the SAME values as its own
 *   string-literal unions (`EventType`, `DimensionValueSource`). the domain values are drawn
 *   from those exact literal sets (the dimension `source` is a literal union; the event types
 *   are the documented SES set), so the cast narrows an equal-or-wider domain string to the
 *   sdk enum with no runtime risk — AWS also validates at the api. removal path: if the domain
 *   objects were typed with the sdk enums directly, both casts drop — we keep the friendly
 *   shapes to avoid a hard bind to the sdk's enum types.
 */
export const asEventDestinationDefinition = (input: {
  enabled: boolean;
  eventTypes: string[];
  cloudwatch: Array<{
    name: string;
    source: string;
    defaultValue: string;
  }> | null;
  snsTopicArn: string | null;
}): EventDestinationDefinition => ({
  Enabled: input.enabled,
  // sdk-boundary cast (see .note): domain string[] -> the sdk's EventType[] literal union
  MatchingEventTypes: input.eventTypes as EventType[],
  CloudWatchDestination: input.cloudwatch
    ? {
        DimensionConfigurations: input.cloudwatch.map((dimension) => ({
          DimensionName: dimension.name,
          // sdk-boundary cast (see .note): domain literal -> the sdk's DimensionValueSource
          DimensionValueSource: dimension.source as DimensionValueSource,
          DefaultDimensionValue: dimension.defaultValue,
        })),
      }
    : undefined,
  SnsDestination: input.snsTopicArn
    ? { TopicArn: input.snsTopicArn }
    : undefined,
});
