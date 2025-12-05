import type { DBCluster } from '@aws-sdk/client-rds';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsRdsCluster } from '../../domain.objects/DeclaredAwsRdsCluster';

/**
 * .what = casts an AWS SDK DBCluster to a DeclaredAwsRdsCluster
 * .why = maps AWS response shape to domain object
 */
export const castIntoDeclaredAwsRdsCluster = (
  input: DBCluster,
): HasReadonly<typeof DeclaredAwsRdsCluster> => {
  // failfast if cluster identifier is not defined
  if (!input.DBClusterIdentifier)
    UnexpectedCodePathError.throw(
      'rds cluster lacks DBClusterIdentifier; cannot cast to domain object',
      { input },
    );

  // failfast if endpoint is not defined
  if (!input.Endpoint)
    UnexpectedCodePathError.throw(
      'rds cluster lacks Endpoint; cannot cast to domain object',
      { input },
    );

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsRdsCluster.as({
      arn: input.DBClusterArn,
      name: input.DBClusterIdentifier,
      host: {
        writer: input.Endpoint,
        reader: input.ReaderEndpoint ?? input.Endpoint,
      },
      port: input.Port,
      status: input.Status,
    }),
    hasReadonly({ of: DeclaredAwsRdsCluster }),
  );
};
