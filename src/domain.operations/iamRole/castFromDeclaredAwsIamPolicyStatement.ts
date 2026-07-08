import { BadRequestError } from 'helpful-errors';

import type { DeclaredAwsIamPolicyStatement } from '@src/domain.objects/DeclaredAwsIamPolicyStatement';
import type { DeclaredAwsIamPrincipal } from '@src/domain.objects/DeclaredAwsIamPrincipal';
import type { DeclaredAwsIamPrincipalScope } from '@src/domain.objects/DeclaredAwsIamPrincipalScope';
import type { DeclaredAwsIamStatementScope } from '@src/domain.objects/DeclaredAwsIamStatementScope';

import {
  castFromDeclaredAwsIamPrincipal,
  type SdkAwsPolicyPrincipal,
} from './castFromDeclaredAwsIamPrincipal';

/**
 * .what = aws sdk policy statement format
 * .why = defines the shape expected by iam api
 * .note = includes the negated elements (NotResource/NotAction/NotPrincipal); each is
 *   mutually exclusive with its positive counterpart in the same statement
 */
export interface SdkAwsPolicyStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Principal?: SdkAwsPolicyPrincipal;
  NotPrincipal?: SdkAwsPolicyPrincipal;
  Action?: string | string[];
  NotAction?: string | string[];
  Resource?: string | string[];
  NotResource?: string | string[];
  Condition?: Record<string, Record<string, string | string[]>>;
}

/**
 * .what = whether a match value is a `{ include, exclude }` scope (vs a bare value)
 * .why = distinguishes an explicit scope from the bare shorthand (string/array/principal)
 * .note = a scope is an object that carries an `include` or `exclude` key; a bare resource
 *   is a string/array, and a bare principal carries `aws`/`service`/`federated` instead
 */
const isScope = (
  value: unknown,
): value is { include?: unknown; exclude?: unknown } =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  ('include' in value || 'exclude' in value);

/**
 * .what = whether an exclusion set is empty (empty string or empty array)
 * .why = an empty exclusion is almost certainly a mistake; we fail-fast on it
 * .note = string and array both expose `.length`, so one check covers both
 */
const isEmptyExclusion = (exclude: string | string[]): boolean =>
  exclude.length === 0;

/**
 * .what = splits a resource/action match into its positive vs negated (`Not*`) parts
 * .why = maps the `{ include, exclude }` scope to the AWS positive/negated elements, with
 *   a fail-fast on both-set (AWS forbids both) and on an empty exclusion
 */
const asMatchParts = (input: {
  field: string;
  value: string | string[] | DeclaredAwsIamStatementScope | undefined;
}): { positive?: string | string[]; negated?: string | string[] } => {
  const { field, value } = input;

  // absent — emit none
  if (value === undefined) return {};

  // bare value — the shorthand for `{ include }`; emit as the positive element
  if (!isScope(value)) return { positive: value };

  // reject a scope that sets both include and exclude: it would map to a statement with
  // both a positive and its `Not` counterpart, which AWS forbids — fail-fast
  if (value.include !== undefined && value.exclude !== undefined)
    BadRequestError.throw(
      `iam policy statement "${field}" scope sets both "include" and "exclude"`,
      { field, value },
    );

  // include — emit as the positive element
  if (value.include !== undefined) return { positive: value.include };

  // exclude — emit as the negated (`Not*`) element, after an empty-set fail-fast
  if (value.exclude !== undefined) {
    // reject an empty exclusion: `{ exclude: [] }` excludes no value, so it is almost
    // certainly a mistake and would silently widen the statement — fail-fast instead
    if (isEmptyExclusion(value.exclude))
      BadRequestError.throw(
        `iam policy statement "${field}" has an empty { exclude } exclusion`,
        { field, value },
      );
    return { negated: value.exclude };
  }

  // an empty scope (neither key set) is a malformed match — fail-fast
  return BadRequestError.throw(
    `iam policy statement "${field}" scope sets neither "include" nor "exclude"`,
    { field, value },
  );
};

/**
 * .what = splits the principal match into its positive vs negated (NotPrincipal) parts
 * .why = maps the principal `{ include, exclude }` scope to the AWS elements, with the
 *   same both-set and empty-exclusion fail-fasts as the string match fields
 */
const asPrincipalParts = (
  principal:
    | '*'
    | DeclaredAwsIamPrincipal
    | DeclaredAwsIamPrincipalScope
    | undefined,
): { positive?: SdkAwsPolicyPrincipal; negated?: SdkAwsPolicyPrincipal } => {
  // absent — emit none
  if (principal === undefined) return {};

  // bare '*' or a bare principal — the shorthand for `{ include }`; emit as positive
  if (!isScope(principal))
    return { positive: castFromDeclaredAwsIamPrincipal(principal) };

  // reject a scope that sets both include and exclude (AWS forbids both)
  if (principal.include !== undefined && principal.exclude !== undefined)
    BadRequestError.throw(
      'iam policy statement "principal" scope sets both "include" and "exclude"',
      { principal },
    );

  // include — emit as Principal
  if (principal.include !== undefined)
    return {
      positive: castFromDeclaredAwsIamPrincipal(
        principal.include as DeclaredAwsIamPrincipal,
      ),
    };

  // exclude — emit as NotPrincipal, after an empty-principal fail-fast
  if (principal.exclude !== undefined) {
    const negated = castFromDeclaredAwsIamPrincipal(
      principal.exclude as DeclaredAwsIamPrincipal,
    );
    // a NotPrincipal must exclude a concrete principal; an empty principal yields no key
    if (negated === undefined || negated === '*')
      BadRequestError.throw(
        'iam policy statement "principal" has an empty { exclude } exclusion',
        { principal },
      );
    return { negated };
  }

  // an empty scope (neither key set) is a malformed principal — fail-fast
  return BadRequestError.throw(
    'iam policy statement "principal" scope sets neither "include" nor "exclude"',
    { principal },
  );
};

/**
 * .what = converts domain policy statement to aws sdk format
 * .why = transforms camelCase domain fields to PascalCase sdk fields, and the
 *   `{ include, exclude }` scope to the AWS positive/`Not*` elements
 */
export const castFromDeclaredAwsIamPolicyStatement = (
  statement: DeclaredAwsIamPolicyStatement,
): SdkAwsPolicyStatement => {
  // split resource/action into positive vs negated parts
  const { positive: Resource, negated: NotResource } = asMatchParts({
    field: 'resource',
    value: statement.resource,
  });
  const { positive: Action, negated: NotAction } = asMatchParts({
    field: 'action',
    value: statement.action,
  });

  // split principal into positive vs negated (NotPrincipal) parts
  const { positive: Principal, negated: NotPrincipal } = asPrincipalParts(
    statement.principal,
  );

  // assemble the sdk statement — undefined keys are dropped on JSON.stringify
  return {
    Sid: statement.sid,
    Effect: statement.effect,
    Principal,
    NotPrincipal,
    Action,
    NotAction,
    Resource,
    NotResource,
    Condition: statement.condition as
      | Record<string, Record<string, string | string[]>>
      | undefined,
  };
};
