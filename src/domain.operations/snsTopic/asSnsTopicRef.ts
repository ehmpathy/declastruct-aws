import type { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import type { PickOne } from 'type-fns';

import type { DeclaredAwsSnsTopic } from '@src/domain.objects/DeclaredAwsSnsTopic';

import { asSnsTopicArn } from './asSnsTopicArn';
import { asSnsTopicName } from './asSnsTopicName';

/**
 * .what = normalizes any get-by input (primary | unique | ref) into { arn, name }
 * .why = one place to derive the pair, so getOne + del share the same derivation
 */
export const asSnsTopicRef = (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsSnsTopic>;
      unique: RefByUnique<typeof DeclaredAwsSnsTopic>;
      ref: Ref<typeof DeclaredAwsSnsTopic>;
    }>;
  },
  context: { account: string; region: string },
): { arn: string; name: string } => {
  // by primary — arn given, derive name
  if (input.by.primary)
    return {
      arn: input.by.primary.arn,
      name: asSnsTopicName({ arn: input.by.primary.arn }),
    };

  // by unique — name given, derive arn
  if (input.by.unique)
    return {
      arn: asSnsTopicArn({ name: input.by.unique.name, ...context }),
      name: input.by.unique.name,
    };

  // by ref — either a name-ref or an arn-ref
  const ref = input.by.ref;
  if ('name' in ref)
    return {
      arn: asSnsTopicArn({ name: ref.name, ...context }),
      name: ref.name,
    };
  return { arn: ref.arn, name: asSnsTopicName({ arn: ref.arn }) };
};
