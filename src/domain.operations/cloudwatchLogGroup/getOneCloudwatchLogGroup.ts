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
import { DeclaredAwsCloudwatchLogGroup } from '@src/domain.objects/DeclaredAwsCloudwatchLogGroup';

import { castIntoDeclaredAwsCloudwatchLogGroup } from './castIntoDeclaredAwsCloudwatchLogGroup';

/**
 * .what = gets a single log group from aws
 * .why = enables lookup by primary (arn) or unique (name)
 */
export const getOneCloudwatchLogGroup = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsCloudwatchLogGroup>;
        unique: RefByUnique<typeof DeclaredAwsCloudwatchLogGroup>;
        ref: Ref<typeof DeclaredAwsCloudwatchLogGroup>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCloudwatchLogGroup> | null> => {
    // handle by ref using type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsCloudwatchLogGroup })(input.by.ref))
        return getOneCloudwatchLogGroup(
          { by: { unique: input.by.ref } },
          context,
        );
      if (isRefByPrimary({ of: DeclaredAwsCloudwatchLogGroup })(input.by.ref))
        return getOneCloudwatchLogGroup(
          { by: { primary: input.by.ref } },
          context,
        );
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
      return castIntoDeclaredAwsCloudwatchLogGroup(response.logGroups[0]!);
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle log group not found
      if (error.name === 'ResourceNotFoundException') return null;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      if (metadata?.httpStatusCode === 404) return null;

      throw new HelpfulError('aws.getOneCloudwatchLogGroup error', {
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
