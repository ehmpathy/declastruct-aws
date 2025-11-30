import type { DBCluster } from '@aws-sdk/client-rds';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsRdsCluster } from './castIntoDeclaredAwsRdsCluster';

describe('castIntoDeclaredAwsRdsCluster', () => {
  given('an AWS DBCluster with all properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsRdsCluster>;

      then('it should cast', () => {
        const awsCluster: DBCluster = {
          DBClusterArn:
            'arn:aws:rds:us-east-1:123456789012:cluster:mydb-cluster',
          DBClusterIdentifier: 'mydb-cluster',
          Endpoint: 'mydb-cluster.cluster-xxx.us-east-1.rds.amazonaws.com',
          ReaderEndpoint:
            'mydb-cluster.cluster-ro-xxx.us-east-1.rds.amazonaws.com',
          Port: 5432,
          Status: 'available',
        };
        result = castIntoDeclaredAwsRdsCluster(awsCluster);
      });

      then('it should have all properties mapped', () => {
        expect(result).toMatchObject({
          arn: 'arn:aws:rds:us-east-1:123456789012:cluster:mydb-cluster',
          name: 'mydb-cluster',
          host: {
            writer: 'mydb-cluster.cluster-xxx.us-east-1.rds.amazonaws.com',
            reader: 'mydb-cluster.cluster-ro-xxx.us-east-1.rds.amazonaws.com',
          },
          port: 5432,
          status: 'available',
        });
      });
    });
  });

  given('an AWS DBCluster without DBClusterIdentifier', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsCluster: DBCluster = {
          DBClusterArn:
            'arn:aws:rds:us-east-1:123456789012:cluster:mydb-cluster',
          Endpoint: 'mydb-cluster.cluster-xxx.us-east-1.rds.amazonaws.com',
        };
        const error = await getError(() =>
          castIntoDeclaredAwsRdsCluster(awsCluster),
        );
        expect(error.message).toContain(
          'rds cluster lacks DBClusterIdentifier',
        );
      });
    });
  });

  given('an AWS DBCluster without ReaderEndpoint', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castIntoDeclaredAwsRdsCluster>;

      then('it should cast', () => {
        const awsCluster: DBCluster = {
          DBClusterArn:
            'arn:aws:rds:us-east-1:123456789012:cluster:single-writer-cluster',
          DBClusterIdentifier: 'single-writer-cluster',
          Endpoint:
            'single-writer-cluster.cluster-xxx.us-east-1.rds.amazonaws.com',
          Port: 5432,
          Status: 'available',
        };
        result = castIntoDeclaredAwsRdsCluster(awsCluster);
      });

      then('reader should fall back to writer endpoint', () => {
        expect(result.host?.reader).toBe(result.host?.writer);
      });
    });
  });

  given('an AWS DBCluster without Endpoint', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsCluster: DBCluster = {
          DBClusterIdentifier: 'no-endpoint-cluster',
          Status: 'creating',
        };
        const error = await getError(() =>
          castIntoDeclaredAwsRdsCluster(awsCluster),
        );
        expect(error.message).toContain('rds cluster lacks Endpoint');
      });
    });
  });
});
