import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { delConfigurationSetEventDestination } from '@src/access/sdks/sdkSesv2/delConfigurationSetEventDestination';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSesConfigurationSetEventDestination } from '@src/domain.objects/DeclaredAwsSesConfigurationSetEventDestination';

/**
 * .what = deletes an SES configuration-set event destination by unique ref
 *   (configurationSet + name)
 * .why = the idempotent destroy path the DAO's set.delete drives; an absent destination is a
 *   no-op so a repeat delete converges
 */
export const delSesConfigurationSetEventDestination = asProcedure(
  async (
    input: {
      by: { ref: Ref<typeof DeclaredAwsSesConfigurationSetEventDestination> };
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // an event destination is keyed only by its unique (configuration set + name)
    if (
      !isRefByUnique({ of: DeclaredAwsSesConfigurationSetEventDestination })(
        input.by.ref,
      )
    )
      UnexpectedCodePathError.throw(
        'event destinations only support a unique ref for deletion',
        { ref: input.by.ref },
      );
    const ref = input.by.ref;

    // drop the event destination (idempotent)
    await delConfigurationSetEventDestination(
      { configurationSetName: ref.configurationSet.name, name: ref.name },
      context,
    );
  },
);
