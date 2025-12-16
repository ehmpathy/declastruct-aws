import { DescribeDBClustersCommand, RDSClient } from '@aws-sdk/client-rds';
import type { HasReadonly, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsRdsCluster } from '@src/domain.objects/DeclaredAwsRdsCluster';

import { castIntoDeclaredAwsRdsCluster } from './castIntoDeclaredAwsRdsCluster';

/**
 * .what = gets an RDS cluster from AWS
 * .why = enables lookup of RDS cluster endpoints and metadata
 */
export const getRdsCluster = async (
  input: {
    by: { unique: RefByUnique<typeof DeclaredAwsRdsCluster> };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsRdsCluster> | null> => {
  // create rds client
  const rds = new RDSClient({ region: context.aws.credentials.region });

  // build command to describe cluster by identifier
  const command = new DescribeDBClustersCommand({
    DBClusterIdentifier: input.by.unique.name,
  });

  // send command and handle not found
  try {
    const response = await rds.send(command);

    // extract cluster from response
    const [cluster, ...collisions] = response.DBClusters ?? [];
    if (!cluster) return null;

    // failfast if more than one cluster found
    if (collisions.length)
      UnexpectedCodePathError.throw(
        'multiple rds clusters found; expected exactly one',
        { input, count: collisions.length + 1 },
      );

    return castIntoDeclaredAwsRdsCluster(cluster);
  } catch (error) {
    // handle not found gracefully
    if (error instanceof Error && error.name === 'DBClusterNotFoundFault')
      return null;

    throw error;
  }
};
