import { DomainLiteral } from 'domain-objects';

/**
 * .what = an iam policy condition block
 * .why = conditions restrict when a policy statement applies
 *
 * .note
 *   - each operator (StringEquals, StringLike, etc) maps keys to values
 *   - this is a literal (value object) since it has no identity — just shape
 *
 * @see https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
 */
export interface DeclaredAwsIamPolicyCondition {
  // string operators
  StringEquals?: Record<string, string | string[]>;
  StringNotEquals?: Record<string, string | string[]>;
  StringEqualsIgnoreCase?: Record<string, string | string[]>;
  StringNotEqualsIgnoreCase?: Record<string, string | string[]>;
  StringLike?: Record<string, string | string[]>;
  StringNotLike?: Record<string, string | string[]>;

  // arn operators
  ArnEquals?: Record<string, string | string[]>;
  ArnNotEquals?: Record<string, string | string[]>;
  ArnLike?: Record<string, string | string[]>;
  ArnNotLike?: Record<string, string | string[]>;

  // numeric operators
  NumericEquals?: Record<string, string | string[]>;
  NumericNotEquals?: Record<string, string | string[]>;
  NumericLessThan?: Record<string, string | string[]>;
  NumericLessThanEquals?: Record<string, string | string[]>;
  NumericGreaterThan?: Record<string, string | string[]>;
  NumericGreaterThanEquals?: Record<string, string | string[]>;

  // date operators
  DateEquals?: Record<string, string | string[]>;
  DateNotEquals?: Record<string, string | string[]>;
  DateLessThan?: Record<string, string | string[]>;
  DateLessThanEquals?: Record<string, string | string[]>;
  DateGreaterThan?: Record<string, string | string[]>;
  DateGreaterThanEquals?: Record<string, string | string[]>;

  // boolean operator
  Bool?: Record<string, string | string[]>;

  // ip address operators
  IpAddress?: Record<string, string | string[]>;
  NotIpAddress?: Record<string, string | string[]>;

  // null check
  Null?: Record<string, string | string[]>;
}

export class DeclaredAwsIamPolicyCondition
  extends DomainLiteral<DeclaredAwsIamPolicyCondition>
  implements DeclaredAwsIamPolicyCondition
{
  public static nested = {
    // string operators
    StringEquals: DomainLiteral,
    StringNotEquals: DomainLiteral,
    StringEqualsIgnoreCase: DomainLiteral,
    StringNotEqualsIgnoreCase: DomainLiteral,
    StringLike: DomainLiteral,
    StringNotLike: DomainLiteral,

    // arn operators
    ArnEquals: DomainLiteral,
    ArnNotEquals: DomainLiteral,
    ArnLike: DomainLiteral,
    ArnNotLike: DomainLiteral,

    // numeric operators
    NumericEquals: DomainLiteral,
    NumericNotEquals: DomainLiteral,
    NumericLessThan: DomainLiteral,
    NumericLessThanEquals: DomainLiteral,
    NumericGreaterThan: DomainLiteral,
    NumericGreaterThanEquals: DomainLiteral,

    // date operators
    DateEquals: DomainLiteral,
    DateNotEquals: DomainLiteral,
    DateLessThan: DomainLiteral,
    DateLessThanEquals: DomainLiteral,
    DateGreaterThan: DomainLiteral,
    DateGreaterThanEquals: DomainLiteral,

    // boolean operator
    Bool: DomainLiteral,

    // ip address operators
    IpAddress: DomainLiteral,
    NotIpAddress: DomainLiteral,

    // null check
    Null: DomainLiteral,
  };
}
