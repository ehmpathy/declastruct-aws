import type { DeclaredAwsIamPolicyStatement } from '../../domain.objects/DeclaredAwsIamPolicyStatement';
import {
  castFromDeclaredAwsIamPrincipal,
  type SdkAwsPolicyPrincipal,
} from './castFromDeclaredAwsIamPrincipal';

/**
 * .what = aws sdk policy statement format
 * .why = defines the shape expected by iam api
 */
export interface SdkAwsPolicyStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Principal?: SdkAwsPolicyPrincipal;
  Action: string | string[];
  Resource?: string | string[];
  Condition?: Record<string, Record<string, string | string[]>>;
}

/**
 * .what = converts domain policy statement to aws sdk format
 * .why = transforms camelCase domain fields to PascalCase sdk fields
 */
export const castFromDeclaredAwsIamPolicyStatement = (
  statement: DeclaredAwsIamPolicyStatement,
): SdkAwsPolicyStatement => ({
  Sid: statement.sid,
  Effect: statement.effect,
  Principal: castFromDeclaredAwsIamPrincipal(statement.principal),
  Action: statement.action,
  Resource: statement.resource,
  Condition: statement.condition as
    | Record<string, Record<string, string | string[]>>
    | undefined,
});
