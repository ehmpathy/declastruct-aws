import { BadRequestError } from 'helpful-errors';

import { DeclaredAwsIamPolicyDocument } from '@src/domain.objects/DeclaredAwsIamPolicyDocument';
import type { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';
import { DeclaredAwsIamPrincipalScope } from '@src/domain.objects/DeclaredAwsIamPrincipalScope';
import { DeclaredAwsIamStatementScope } from '@src/domain.objects/DeclaredAwsIamStatementScope';

import type { SdkAwsPolicyPrincipal } from '../iamRole/castFromDeclaredAwsIamPrincipal';
import { castIntoDeclaredAwsIamPrincipal } from '../iamRole/castIntoDeclaredAwsIamPrincipal';

/**
 * .what = folds a positive value and its `Not*` counterpart into one domain match field
 * .why = AWS emits either the positive element or the negated element; the domain models
 *   the positive as a bare value and the negated as a `{ exclude }` scope
 */
const asMatch = (input: {
  field: string;
  positive: string | string[] | undefined;
  negated: string | string[] | undefined;
}): string | string[] | DeclaredAwsIamStatementScope | undefined => {
  // reject a malformed statement with both the positive and the negated element:
  // AWS grammar forbids it, and to silently drop one would hide the mistake
  if (input.positive !== undefined && input.negated !== undefined)
    BadRequestError.throw(
      `iam policy statement has both "${input.field}" and its "Not" counterpart`,
      { field: input.field, positive: input.positive, negated: input.negated },
    );

  // positive — emit as the bare value (the `{ include }` shorthand)
  if (input.positive !== undefined) return input.positive;

  // negated — emit as the `{ exclude }` scope
  if (input.negated !== undefined)
    return DeclaredAwsIamStatementScope.as({ exclude: input.negated });

  return undefined;
};

/**
 * .what = parses AWS inline policy JSON to domain format
 * .note = maps the AWS `Not*` elements to the domain `{ exclude }` scope
 */
export const castIntoDeclaredAwsIamPolicyDocument = (
  inlinePolicy: string | undefined,
): DeclaredAwsIamPolicyDocument => {
  if (!inlinePolicy)
    return new DeclaredAwsIamPolicyDocument({ statements: [] });

  const awsPolicy = JSON.parse(inlinePolicy) as {
    Statement?: Array<{
      Sid?: string;
      Effect: 'Allow' | 'Deny';
      Principal?: SdkAwsPolicyPrincipal;
      NotPrincipal?: SdkAwsPolicyPrincipal;
      Action?: string | string[];
      NotAction?: string | string[];
      Resource?: string | string[];
      NotResource?: string | string[];
      Condition?: Record<string, Record<string, string | string[]>>;
    }>;
  };

  const statements: DeclaredAwsIamPolicyStatement[] = (
    awsPolicy.Statement ?? []
  ).map((stmt) => {
    // action is required — fold positive Action or negated NotAction
    const action = asMatch({
      field: 'Action',
      positive: stmt.Action,
      negated: stmt.NotAction,
    });
    if (action === undefined)
      BadRequestError.throw(
        'iam policy statement has neither Action nor NotAction',
        { stmt },
      );

    // principal — positive Principal or a NotPrincipal exclusion. map uppercase sdk
    // keys (AWS/Service/Federated) to lowercase domain keys via the shared principal
    // cast, so principals round-trip identically through either read path
    const principal = ((): DeclaredAwsIamPolicyStatement['principal'] => {
      // reject both Principal and NotPrincipal: AWS grammar forbids it, and to
      // silently drop one would hide the mistake
      if (stmt.Principal !== undefined && stmt.NotPrincipal !== undefined)
        return BadRequestError.throw(
          'iam policy statement has both "Principal" and "NotPrincipal"',
          { stmt },
        );

      // positive principal (may be '*')
      if (stmt.Principal !== undefined)
        return castIntoDeclaredAwsIamPrincipal(stmt.Principal);

      // absent principal
      if (stmt.NotPrincipal === undefined) return undefined;

      // a NotPrincipal must exclude a concrete principal — never '*' or empty
      const exclude = castIntoDeclaredAwsIamPrincipal(stmt.NotPrincipal);
      if (exclude === undefined || exclude === '*')
        return BadRequestError.throw(
          'NotPrincipal must exclude a concrete principal, not "*" or empty',
          { stmt },
        );
      return DeclaredAwsIamPrincipalScope.as({ exclude });
    })();

    // resource — positive Resource or a NotResource exclusion
    const resource = asMatch({
      field: 'Resource',
      positive: stmt.Resource,
      negated: stmt.NotResource,
    });

    return {
      effect: stmt.Effect,
      action,
      ...(stmt.Sid !== undefined && { sid: stmt.Sid }),
      ...(principal !== undefined && { principal }),
      ...(resource !== undefined && { resource }),
      ...(stmt.Condition !== undefined && { condition: stmt.Condition }),
    };
  });

  return new DeclaredAwsIamPolicyDocument({ statements });
};
