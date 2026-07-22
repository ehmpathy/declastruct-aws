import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import { DeclaredAwsSsmParameterSecure } from '@src/domain.objects/DeclaredAwsSsmParameterSecure';

/**
 * .what = derives the ssm parameter name (path) from a secret's ref, unique key, or primary key
 * .why = DescribeParameters + DeleteParameter act by Name (the path), not arn. a unique key
 *   already holds the name; a primary key holds the arn, whose name is the segment after
 *   ':parameter'. extracts this decode so the get/del orchestrators read as narrative.
 */
export const asSsmParameterName = (input: {
  by: PickOne<{
    primary: RefByPrimary<typeof DeclaredAwsSsmParameterSecure>;
    unique: RefByUnique<typeof DeclaredAwsSsmParameterSecure>;
    ref: Ref<typeof DeclaredAwsSsmParameterSecure>;
  }>;
}): string => {
  // a ref is either a unique (name) or a primary (arn) key
  if (input.by.ref) {
    if (isRefByUnique({ of: DeclaredAwsSsmParameterSecure })(input.by.ref))
      return input.by.ref.name;
    if (isRefByPrimary({ of: DeclaredAwsSsmParameterSecure })(input.by.ref))
      return input.by.ref.arn.replace(/^.*:parameter/, '');
    return UnexpectedCodePathError.throw('ref is neither unique nor primary', {
      by: input.by,
    });
  }

  // a unique key already holds the name (path)
  if (input.by.unique) return input.by.unique.name;

  // a primary key holds the arn; the name is the path after ':parameter'
  if (input.by.primary)
    return input.by.primary.arn.replace(/^.*:parameter/, '');

  return UnexpectedCodePathError.throw('not referenced by primary nor unique', {
    by: input.by,
  });
};
