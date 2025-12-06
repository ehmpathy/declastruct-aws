import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  DeleteRetentionPolicyCommand,
  PutRetentionPolicyCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsLogGroup } from '../../domain.objects/DeclaredAwsLogGroup';
import { getOneLogGroup } from './getOneLogGroup';

/**
 * .what = creates or updates a log group
 * .why = enables declarative log group management with retention policies
 *
 * .note
 *   - finsert: creates if not found, returns foundBefore if found
 *   - upsert: creates if not found, updates retention if found
 *   - CreateLogGroupCommand for new log groups
 *   - PutRetentionPolicyCommand / DeleteRetentionPolicyCommand for retention
 *   - logGroupClass cannot be changed after creation (AWS limitation)
 */
export const setLogGroup = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsLogGroup;
      upsert: DeclaredAwsLogGroup;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLogGroup>> => {
    const logGroupDesired = input.finsert ?? input.upsert;

    // create client
    const logs = new CloudWatchLogsClient({
      region: context.aws.credentials.region,
    });

    // check if log group already exists
    const foundBefore = await getOneLogGroup(
      { by: { unique: { name: logGroupDesired.name } } },
      context,
    );

    // handle finsert: if found, return it
    if (foundBefore && input.finsert) return foundBefore;

    // create log group if not found
    if (!foundBefore) {
      await logs.send(
        new CreateLogGroupCommand({
          logGroupName: logGroupDesired.name,
          logGroupClass: logGroupDesired.class,
          kmsKeyId: logGroupDesired.kmsKeyId ?? undefined,
        }),
      );
    }

    // set or delete retention policy (for both new and found)
    if (logGroupDesired.retentionInDays !== undefined) {
      // skip if retention hasn't changed (optimization for upsert)
      const retentionChanged =
        !foundBefore ||
        foundBefore.retentionInDays !== logGroupDesired.retentionInDays;

      if (retentionChanged) {
        if (logGroupDesired.retentionInDays !== null) {
          // set retention
          await logs.send(
            new PutRetentionPolicyCommand({
              logGroupName: logGroupDesired.name,
              retentionInDays: logGroupDesired.retentionInDays,
            }),
          );
        } else {
          // delete retention (never expire)
          await logs.send(
            new DeleteRetentionPolicyCommand({
              logGroupName: logGroupDesired.name,
            }),
          );
        }
      }
    }

    // fetch and return the log group
    const foundAfter = await getOneLogGroup(
      { by: { unique: { name: logGroupDesired.name } } },
      context,
    );

    // failfast if not found after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('log group not found after set', {
        logGroupDesired,
      });

    return foundAfter;
  },
);
