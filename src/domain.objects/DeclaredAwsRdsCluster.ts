import { DomainEntity } from 'domain-objects';

/**
 * .what = a declarative structure which represents an AWS RDS cluster
 * .why = enables declarative control of AWS RDS clusters
 */
export interface DeclaredAwsRdsCluster {
  /**
   * .what = the cluster ARN
   * .note = is @metadata -> identity assigned by AWS
   */
  arn?: string;

  /**
   * .what = the cluster identifier
   */
  name: string;

  /**
   * .what = the cluster hostnames
   * .note = is @readonly -> resolved from AWS
   */
  host?: {
    writer: string;
    reader: string;
  };

  /**
   * .what = the database port
   * .note = is @readonly -> resolved from AWS
   */
  port?: number;

  /**
   * .what = the cluster status
   * .note = is @readonly -> resolved from AWS
   */
  status?: string;
}

export class DeclaredAwsRdsCluster
  extends DomainEntity<DeclaredAwsRdsCluster>
  implements DeclaredAwsRdsCluster
{
  public static primary = ['arn'] as const;
  public static unique = ['name'] as const;

  /**
   * .what = identity attributes assigned by the persistence layer
   * .note = describes the entity for persistence purposes, not intrinsic attributes
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   * .note = these are real attributes of the resource, but derived from the source of truth
   */
  public static readonly = ['host', 'port', 'status'] as const;
}
