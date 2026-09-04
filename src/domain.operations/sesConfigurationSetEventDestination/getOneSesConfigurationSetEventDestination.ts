import { asProcedure } from 'as-procedure';
import type { RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';

import { getConfigurationSetEventDestinations } from '@src/access/sdks/sdkSesv2/getConfigurationSetEventDestinations';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSesConfigurationSetEventDestination } from '@src/domain.objects/DeclaredAwsSesConfigurationSetEventDestination';

import { castIntoDeclaredAwsSesConfigurationSetEventDestination } from './castIntoDeclaredAwsSesConfigurationSetEventDestination';
import { getOneDestinationByName } from './getOneDestinationByName';

/**
 * .what = gets a single SES configuration-set event destination by unique
 *   (configurationSet + name)
 * .why = enables declarative drift detection; returns null when the set or the destination is
 *   absent so the plan reads CREATE rather than throw
 *   (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneSesConfigurationSetEventDestination = asProcedure(
  async (
    input: {
      by: {
        unique: RefByUnique<
          typeof DeclaredAwsSesConfigurationSetEventDestination
        >;
      };
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<DeclaredAwsSesConfigurationSetEventDestination | null> => {
    // the unique key is the configuration set + the destination name
    const configurationSetName = input.by.unique.configurationSet.name;
    const name = input.by.unique.name;

    // read all destinations on the set (null if the set is absent)
    const found = await getConfigurationSetEventDestinations(
      { configurationSetName },
      context,
    );
    if (!found) return null;

    // pick the one with our name (null if absent)
    const destination = getOneDestinationByName({ destinations: found, name });
    if (!destination) return null;

    // cast to domain format
    return castIntoDeclaredAwsSesConfigurationSetEventDestination({
      configurationSetName,
      name: destination.name,
      enabled: destination.enabled,
      eventTypes: destination.eventTypes,
      cloudwatch: destination.cloudwatch,
      snsTopicArn: destination.snsTopicArn,
    });
  },
);
