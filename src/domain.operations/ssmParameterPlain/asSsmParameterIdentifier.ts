import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import { DeclaredAwsSsmParameterPlain } from '@src/domain.objects/DeclaredAwsSsmParameterPlain';

/**
 * .what = derives the GetParameter identifier from a plain param's ref, unique key, or primary key
 * .why = GetParameter's Name field accepts EITHER the name (path) or the full arn, so no
 *   arn→name strip is needed here (unlike the secret variant). extracts this decode so the
 *   get orchestrator reads as narrative.
 */
export const asSsmParameterIdentifier = (input: {
  by: PickOne<{
    primary: RefByPrimary<typeof DeclaredAwsSsmParameterPlain>;
    unique: RefByUnique<typeof DeclaredAwsSsmParameterPlain>;
    ref: Ref<typeof DeclaredAwsSsmParameterPlain>;
  }>;
}): string => {
  // a ref is either a unique (name) or a primary (arn) key
  if (input.by.ref) {
    if (isRefByUnique({ of: DeclaredAwsSsmParameterPlain })(input.by.ref))
      return input.by.ref.name;
    if (isRefByPrimary({ of: DeclaredAwsSsmParameterPlain })(input.by.ref))
      return input.by.ref.arn;
    return UnexpectedCodePathError.throw('ref is neither unique nor primary', {
      by: input.by,
    });
  }

  // a unique key holds the name; a primary key holds the arn (GetParameter accepts either)
  if (input.by.unique) return input.by.unique.name;
  if (input.by.primary) return input.by.primary.arn;

  return UnexpectedCodePathError.throw('not referenced by primary nor unique', {
    by: input.by,
  });
};
