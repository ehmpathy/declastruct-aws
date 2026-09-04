import { RefByUnique } from 'domain-objects';

import {
  DeclaredAwsSesCloudwatchDimension,
  isSesCloudwatchDimensionSource,
} from '@src/domain.objects/DeclaredAwsSesCloudwatchDimension';
import type { DeclaredAwsSesConfigurationSet } from '@src/domain.objects/DeclaredAwsSesConfigurationSet';
import {
  DeclaredAwsSesConfigurationSetEventDestination,
  isSesEventType,
} from '@src/domain.objects/DeclaredAwsSesConfigurationSetEventDestination';
import { DeclaredAwsSesEventSink } from '@src/domain.objects/DeclaredAwsSesEventSink';
import type { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';
import { asSnsTopicName } from '@src/domain.operations/snsTopic/asSnsTopicName';

/**
 * .what = transforms a raw SES event destination read into
 *   DeclaredAwsSesConfigurationSetEventDestination
 * .why = ensures type safety at the sdk boundary; rebuilds the sink so a re-plan compares
 *   domain objects — an SNS sink's topic arn is cast back to a RefByUnique topic name
 */
export const castIntoDeclaredAwsSesConfigurationSetEventDestination = (input: {
  configurationSetName: string;
  name: string;
  enabled: boolean;
  eventTypes: string[];
  cloudwatch: Array<{
    name: string;
    source: string;
    defaultValue: string;
  }> | null;
  snsTopicArn: string | null;
}): DeclaredAwsSesConfigurationSetEventDestination => {
  // rebuild the sink — exactly one of cloudwatch / sns is non-null
  const sink = new DeclaredAwsSesEventSink({
    cloudwatch: input.cloudwatch
      ? input.cloudwatch.map(
          (dimension) =>
            new DeclaredAwsSesCloudwatchDimension({
              name: dimension.name,
              // fail loud if aws returns a source outside our modeled union, rather than a
              // silent mistype that would skew a plan diff (rule.require.assure-via-type-checks)
              source: isSesCloudwatchDimensionSource.assure(dimension.source),
              defaultValue: dimension.defaultValue,
            }),
        )
      : null,
    sns: input.snsTopicArn
      ? RefByUnique.as<typeof DeclaredAwsSnsTopic>({
          name: asSnsTopicName({ arn: input.snsTopicArn }),
        })
      : null,
  });

  return DeclaredAwsSesConfigurationSetEventDestination.as({
    configurationSet: RefByUnique.as<typeof DeclaredAwsSesConfigurationSet>({
      name: input.configurationSetName,
    }),
    name: input.name,
    enabled: input.enabled,
    // fail loud if aws returns an event type outside our modeled union, rather than a silent
    // mistype that would skew a plan diff (rule.require.assure-via-type-checks). the sort to a
    // canonical order is applied by the domain object's constructor (asCanonicalSesEventTypes),
    // the single chokepoint both this read-back and the declared desired pass through, so a
    // re-plan converges to KEEP regardless of AWS's return order (rule.require.guaranteed-idempotency).
    eventTypes: input.eventTypes.map((eventType) =>
      isSesEventType.assure(eventType),
    ),
    sink,
  });
};
