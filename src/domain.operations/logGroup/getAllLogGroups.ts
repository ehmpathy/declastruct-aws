import {
  CloudWatchLogsClient,
  paginateDescribeLogGroups,
} from '@aws-sdk/client-cloudwatch-logs';
import { asProcedure } from 'as-procedure';
import { HasReadonly } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLogGroup } from '../../domain.objects/DeclaredAwsLogGroup';
import { castIntoDeclaredAwsLogGroup } from './castIntoDeclaredAwsLogGroup';

/**
 * .what = lists all log groups from aws
 * .why = enables bulk retrieval of log group configurations
 */
export const getAllLogGroups = asProcedure(
  async (
    input: {
      by?: {
        prefix?: string;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLogGroup>[]> => {
    // declare the client
    const logs = new CloudWatchLogsClient({
      region: context.aws.credentials.region,
    });

    try {
      // collect all log groups using pagination
      const logGroups: HasReadonly<typeof DeclaredAwsLogGroup>[] = [];

      // iterate through pages
      for await (const page of paginateDescribeLogGroups(
        { client: logs },
        { logGroupNamePrefix: input.by?.prefix },
      )) {
        // cast each log group and add to results
        const pageLogGroups = (page.logGroups ?? []).map(
          castIntoDeclaredAwsLogGroup,
        );
        logGroups.push(...pageLogGroups);
      }

      return logGroups;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new HelpfulError('aws.getAllLogGroups error', { cause: error });
    }
  },
);
