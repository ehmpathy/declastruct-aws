import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { createConfigurationSetEventDestination } from '@src/access/sdks/sdkSesv2/createConfigurationSetEventDestination';
import { updateConfigurationSetEventDestination } from '@src/access/sdks/sdkSesv2/updateConfigurationSetEventDestination';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesConfigurationSetEventDestination } from '@src/domain.objects/DeclaredAwsSesConfigurationSetEventDestination';
import { asSnsTopicArn } from '@src/domain.operations/snsTopic/asSnsTopicArn';
import { assertExactlyOnePresent } from '@src/infra/validation/assertExactlyOnePresent';

import { asCloudwatchDimensionParams } from './asCloudwatchDimensionParams';
import { getOneSesConfigurationSetEventDestination } from './getOneSesConfigurationSetEventDestination';

/**
 * .what = creates or updates an SES configuration-set event destination (findsert | upsert)
 * .why = enables declarative delivery of sent-mail events to a sink (cloudwatch | sns)
 *
 * .idempotency
 *   - findsert on the FULL unique key (configurationSet + name): look up first, return the
 *     extant if present, else create. a re-run converges to KEEP.
 *   - upsert converges the extant destination in place via UpdateConfigurationSetEventDestination.
 */
export const setSesConfigurationSetEventDestination = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSesConfigurationSetEventDestination;
      upsert: DeclaredAwsSesConfigurationSetEventDestination;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<DeclaredAwsSesConfigurationSetEventDestination> => {
    const desired = input.findsert ?? input.upsert;

    // enforce the "exactly one sink" invariant the domain object documents, so a malformed
    // sink (0 or 2 sinks) fails loud here instead of a raw SDK error at apply
    assertExactlyOnePresent({
      of: desired.sink,
      keys: ['cloudwatch', 'sns'],
      label: 'an event destination sink',
    });

    // find the extant destination by unique (configuration set + name)
    const foundBefore = await getOneSesConfigurationSetEventDestination(
      {
        by: {
          unique: {
            configurationSet: desired.configurationSet,
            name: desired.name,
          },
        },
      },
      context,
    );

    // findsert: return the extant unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // derive the sns topic arn from the sink's topic ref (if an sns sink)
    const snsTopicArn = desired.sink.sns
      ? asSnsTopicArn({
          name: desired.sink.sns.name,
          account: context.aws.credentials.account,
          region: context.aws.credentials.region,
        })
      : null;

    // cast the cloudwatch dimensions to the friendly sdk shape (if a cloudwatch sink)
    const cloudwatch = desired.sink.cloudwatch
      ? asCloudwatchDimensionParams({ dimensions: desired.sink.cloudwatch })
      : null;

    // the shared friendly params for create + update
    const params = {
      configurationSetName: desired.configurationSet.name,
      name: desired.name,
      enabled: desired.enabled,
      eventTypes: desired.eventTypes,
      cloudwatch,
      snsTopicArn,
    };

    // update the extant destination in place; create it when absent
    if (foundBefore)
      await updateConfigurationSetEventDestination(params, context);
    if (!foundBefore)
      await createConfigurationSetEventDestination(params, context);

    // read back the written destination
    const foundAfter = await getOneSesConfigurationSetEventDestination(
      {
        by: {
          unique: {
            configurationSet: desired.configurationSet,
            name: desired.name,
          },
        },
      },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw(
        'ses configuration set event destination not found after set',
        { desired },
      );

    return foundAfter;
  },
);
