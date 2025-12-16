import { DescribeDBClustersCommand, RDSClient } from '@aws-sdk/client-rds';
import { mockClient } from 'aws-sdk-client-mock';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getRdsCluster } from './getRdsCluster';

const rdsMock = mockClient(RDSClient);

const mockContext = getMockedAwsApiContext();

describe('getRdsCluster', () => {
  beforeEach(() => {
    rdsMock.reset();
  });

  given('a cluster exists with the given name', () => {
    when('looked up by unique name', () => {
      let result: Awaited<ReturnType<typeof getRdsCluster>>;

      then('it should call DescribeDBClusters with identifier', async () => {
        rdsMock.on(DescribeDBClustersCommand).resolves({
          DBClusters: [
            {
              DBClusterArn:
                'arn:aws:rds:us-east-1:123456789012:cluster:test-cluster',
              DBClusterIdentifier: 'test-cluster',
              Endpoint: 'test-cluster.cluster-xxx.us-east-1.rds.amazonaws.com',
              ReaderEndpoint:
                'test-cluster.cluster-ro-xxx.us-east-1.rds.amazonaws.com',
              Port: 5432,
              Status: 'available',
            },
          ],
        });

        result = await getRdsCluster(
          { by: { unique: { name: 'test-cluster' } } },
          mockContext,
        );
      });

      then('it should return the cluster', () => {
        expect(result).toMatchObject({
          name: 'test-cluster',
          host: {
            writer: 'test-cluster.cluster-xxx.us-east-1.rds.amazonaws.com',
            reader: 'test-cluster.cluster-ro-xxx.us-east-1.rds.amazonaws.com',
          },
          port: 5432,
          status: 'available',
        });
      });
    });
  });

  given('no cluster exists with the given name', () => {
    when('looked up', () => {
      let result: Awaited<ReturnType<typeof getRdsCluster>>;

      then('it should return null (empty response)', async () => {
        rdsMock.on(DescribeDBClustersCommand).resolves({
          DBClusters: [],
        });

        result = await getRdsCluster(
          { by: { unique: { name: 'nonexistent-cluster' } } },
          mockContext,
        );
      });

      then('result should be null', () => {
        expect(result).toBeNull();
      });
    });
  });

  given('cluster not found fault is thrown', () => {
    when('looked up', () => {
      then('it should return null', async () => {
        const notFoundError = new Error('DBCluster nonexistent not found');
        notFoundError.name = 'DBClusterNotFoundFault';
        rdsMock.on(DescribeDBClustersCommand).rejects(notFoundError);

        const result = await getRdsCluster(
          { by: { unique: { name: 'nonexistent-cluster' } } },
          mockContext,
        );

        expect(result).toBeNull();
      });
    });
  });

  given('an unexpected error occurs', () => {
    when('looked up', () => {
      then('it should throw the error', async () => {
        const unexpectedError = new Error('Access denied');
        unexpectedError.name = 'AccessDeniedException';
        rdsMock.on(DescribeDBClustersCommand).rejects(unexpectedError);

        await expect(
          getRdsCluster(
            { by: { unique: { name: 'some-cluster' } } },
            mockContext,
          ),
        ).rejects.toThrow('Access denied');
      });
    });
  });
});
