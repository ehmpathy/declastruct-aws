import { given, then, when } from 'test-fns';

import { DeclaredAwsRdsCluster } from './DeclaredAwsRdsCluster';

describe('DeclaredAwsRdsCluster', () => {
  given('a valid name', () => {
    when('instantiated', () => {
      let cluster: DeclaredAwsRdsCluster;

      then('it should instantiate', () => {
        cluster = new DeclaredAwsRdsCluster({ name: 'test-db' });
      });

      then('it should have the name', () => {
        expect(cluster).toMatchObject({ name: 'test-db' });
      });

      then('metadata and readonly are undefined by default', () => {
        expect(cluster.arn).toBeUndefined();
        expect(cluster.host).toBeUndefined();
        expect(cluster.port).toBeUndefined();
        expect(cluster.status).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and readonly', () => {
      let cluster: DeclaredAwsRdsCluster;

      then('it should instantiate', () => {
        cluster = new DeclaredAwsRdsCluster({
          name: 'test-db',
          arn: 'arn:aws:rds:us-east-1:123456789012:cluster:test-db',
          host: {
            writer: 'test-db.cluster-xyz.us-east-1.rds.amazonaws.com',
            reader: 'test-db.cluster-ro-xyz.us-east-1.rds.amazonaws.com',
          },
          port: 5432,
          status: 'available',
        });
      });

      then('it should have all properties', () => {
        expect(cluster).toMatchObject({
          name: 'test-db',
          arn: 'arn:aws:rds:us-east-1:123456789012:cluster:test-db',
          host: {
            writer: 'test-db.cluster-xyz.us-east-1.rds.amazonaws.com',
            reader: 'test-db.cluster-ro-xyz.us-east-1.rds.amazonaws.com',
          },
          port: 5432,
          status: 'available',
        });
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as name', () => {
      expect(DeclaredAwsRdsCluster.unique).toEqual(['name']);
    });

    then('metadata is defined as arn', () => {
      expect(DeclaredAwsRdsCluster.metadata).toEqual(['arn']);
    });

    then('readonly is defined as host, port, status', () => {
      expect(DeclaredAwsRdsCluster.readonly).toEqual([
        'host',
        'port',
        'status',
      ]);
    });
  });
});
