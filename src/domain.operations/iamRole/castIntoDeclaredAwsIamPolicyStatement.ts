import { BadRequestError } from 'helpful-errors';

import { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';
import { DeclaredAwsIamPrincipalScope } from '@src/domain.objects/DeclaredAwsIamPrincipalScope';
import { DeclaredAwsIamStatementScope } from '@src/domain.objects/DeclaredAwsIamStatementScope';

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
  NotPrincipal?: SdkAwsPolicyPrincipal;
  Action?: string | string[];
  NotAction?: string | string[];
  Resource?: string | string[];
  NotResource?: string | string[];
  Condition?: Record<string, Record<string, string | string[]>>;
}

/**
 * .what = casts a raw sdk NotPrincipal into the domain `{ exclude }` scope
 * .why = a NotPrincipal must exclude a concrete principal; `'*'` is not a valid
 *   exclusion (AWS `NotPrincipal: "*"` is nonsensical), so fail-fast on it
 */
const castIntoPrincipalExcludeScope = (
  raw: SdkAwsPolicyPrincipal,
): DeclaredAwsIamPrincipalScope => {
  const principal = castIntoDeclaredAwsIamPrincipal(raw);
  if (principal === undefined || principal === '*')
    BadRequestError.throw(
      'NotPrincipal must exclude a concrete principal, not "*" or empty',
      { raw },
    );
  return DeclaredAwsIamPrincipalScope.as({ exclude: principal });
};

/**
 * .what = converts aws sdk policy statement to domain format
 * .why = transforms PascalCase sdk fields to camelCase domain fields, and the AWS
 *   `Not*` elements into the domain `{ exclude }` scope
 * .note = only includes optional fields when defined to avoid undefined key diffs
 */
export const castIntoDeclaredAwsIamPolicyStatement = (
  stmt: SdkAwsPolicyStatementRaw,
): DeclaredAwsIamPolicyStatement => {
  // reject a malformed statement that sets both a positive element and its `Not`
  // counterpart: AWS grammar forbids it, and to silently drop one would hide the mistake
  if (stmt.Action !== undefined && stmt.NotAction !== undefined)
    BadRequestError.throw(
      'iam policy statement has both "Action" and "NotAction"',
      { stmt },
    );
  if (stmt.Resource !== undefined && stmt.NotResource !== undefined)
    BadRequestError.throw(
      'iam policy statement has both "Resource" and "NotResource"',
      { stmt },
    );
  if (stmt.Principal !== undefined && stmt.NotPrincipal !== undefined)
    BadRequestError.throw(
      'iam policy statement has both "Principal" and "NotPrincipal"',
      { stmt },
    );

  // action is required: the positive Action (bare) or the negated NotAction (exclude)
  const action =
    stmt.Action !== undefined
      ? stmt.Action
      : stmt.NotAction !== undefined
        ? DeclaredAwsIamStatementScope.as({ exclude: stmt.NotAction })
        : BadRequestError.throw(
            'iam policy statement has neither Action nor NotAction',
            { stmt },
          );

  return DeclaredAwsIamPolicyStatement.as({
    ...(stmt.Sid !== undefined && { sid: stmt.Sid }),
    effect: stmt.Effect as 'Allow' | 'Deny',
    ...(stmt.Principal !== undefined && {
      principal: castIntoDeclaredAwsIamPrincipal(stmt.Principal),
    }),
    ...(stmt.NotPrincipal !== undefined && {
      principal: castIntoPrincipalExcludeScope(stmt.NotPrincipal),
    }),
    action,
    ...(stmt.Resource !== undefined && { resource: stmt.Resource }),
    ...(stmt.NotResource !== undefined && {
      resource: DeclaredAwsIamStatementScope.as({ exclude: stmt.NotResource }),
    }),
    ...(stmt.Condition !== undefined && { condition: stmt.Condition }),
  });
};
