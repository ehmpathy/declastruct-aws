import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroup } from '@src/domain.objects/DeclaredAwsLogGroup';

import { castIntoDeclaredAwsLogGroup } from './castIntoDeclaredAwsLogGroup';

/**
 * .what = gets a single log group from aws
 * .why = enables lookup by primary (arn) or unique (name)
 */
export const getOneLogGroup = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsLogGroup>;
        unique: RefByUnique<typeof DeclaredAwsLogGroup>;
        ref: Ref<typeof DeclaredAwsLogGroup>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLogGroup> | null> => {
    // handle by ref using type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsLogGroup })(input.by.ref))
        return getOneLogGroup({ by: { unique: input.by.ref } }, context);
      if (isRefByPrimary({ of: DeclaredAwsLogGroup })(input.by.ref))
        return getOneLogGroup({ by: { primary: input.by.ref } }, context);
      UnexpectedCodePathError.throw('ref is neither unique nor primary', {
        input,
      });
    }

    // declare the client
    const logs = new CloudWatchLogsClient({
      region: context.aws.credentials.region,
    });

    // determine the log group identifier
    const logGroupIdentifier = (() => {
      if (input.by.primary) return input.by.primary.arn;
      if (input.by.unique) return input.by.unique.name;
      throw new UnexpectedCodePathError(
        'not referenced by primary nor unique. how not?',
        { input },
      );
    })();

    // execute the command
    const command = new DescribeLogGroupsCommand({
      logGroupIdentifiers: [logGroupIdentifier],
    });

    try {
      const response = await logs.send(command);

      // return null if no log groups found
      if (!response.logGroups || response.logGroups.length === 0) return null;

      // cast and return the first (and only) log group
      return castIntoDeclaredAwsLogGroup(response.logGroups[0]!);
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle log group not found
      if (error.name === 'ResourceNotFoundException') return null;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      if (metadata?.httpStatusCode === 404) return null;

      throw new HelpfulError('aws.getOneLogGroup error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          httpStatusCode: metadata?.httpStatusCode,
          input,
        },
      });
    }
  },
);
