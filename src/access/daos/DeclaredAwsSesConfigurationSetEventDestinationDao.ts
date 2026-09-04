import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSesConfigurationSetEventDestination } from '@src/domain.objects/DeclaredAwsSesConfigurationSetEventDestination';
import { delSesConfigurationSetEventDestination } from '@src/domain.operations/sesConfigurationSetEventDestination/delSesConfigurationSetEventDestination';
import { getOneSesConfigurationSetEventDestination } from '@src/domain.operations/sesConfigurationSetEventDestination/getOneSesConfigurationSetEventDestination';
import { setSesConfigurationSetEventDestination } from '@src/domain.operations/sesConfigurationSetEventDestination/setSesConfigurationSetEventDestination';

/**
 * .what = declastruct DAO for AWS SES Configuration Set Event Destination resources
 * .why = wraps the event-destination operations to conform to the declastruct interface, so a
 *   destination is drivable through plan/apply like its peers
 * .note = an event destination has no primary key (no arn), only the unique key
 *   (configurationSet + name)
 */
export const DeclaredAwsSesConfigurationSetEventDestinationDao =
  genDeclastructDao<
    typeof DeclaredAwsSesConfigurationSetEventDestination,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsSesConfigurationSetEventDestination,
    get: {
      one: {
        byPrimary: null,
        byUnique: async (input, context) => {
          return getOneSesConfigurationSetEventDestination(
            { by: { unique: input } },
            context,
          );
        },
      },
    },
    set: {
      findsert: async (input, context) => {
        return setSesConfigurationSetEventDestination(
          { findsert: input },
          context,
        );
      },
      upsert: async (input, context) => {
        return setSesConfigurationSetEventDestination(
          { upsert: input },
          context,
        );
      },
      delete: async (input, context) => {
        await delSesConfigurationSetEventDestination(
          { by: { ref: input } },
          context,
        );
      },
    },
  });
