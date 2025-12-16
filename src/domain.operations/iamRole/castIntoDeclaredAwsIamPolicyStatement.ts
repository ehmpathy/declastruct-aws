import { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';

import type { SdkAwsPolicyPrincipal } from './castFromDeclaredAwsIamPrincipal';
import { castIntoDeclaredAwsIamPrincipal } from './castIntoDeclaredAwsIamPrincipal';

/**
 * .what = aws sdk policy statement shape (raw from api)
 * .why = defines the shape received from iam api responses
 */
export interface SdkAwsPolicyStatementRaw {
  Sid?: string;
  Effect: string;
  Principal?: SdkAwsPolicyPrincipal;
  Action: string | string[];
  Resource?: string | string[];
  Condition?: Record<string, Record<string, string | string[]>>;
}

/**
 * .what = converts aws sdk policy statement to domain format
 * .why = transforms PascalCase sdk fields to camelCase domain fields
 * .note = only includes optional fields when defined to avoid undefined key diffs
 */
export const castIntoDeclaredAwsIamPolicyStatement = (
  stmt: SdkAwsPolicyStatementRaw,
): DeclaredAwsIamPolicyStatement =>
  DeclaredAwsIamPolicyStatement.as({
    ...(stmt.Sid !== undefined && { sid: stmt.Sid }),
    effect: stmt.Effect as 'Allow' | 'Deny',
    ...(stmt.Principal !== undefined && {
      principal: castIntoDeclaredAwsIamPrincipal(stmt.Principal),
    }),
    action: stmt.Action,
    ...(stmt.Resource !== undefined && { resource: stmt.Resource }),
    ...(stmt.Condition !== undefined && { condition: stmt.Condition }),
  });
