import type { FunctionConfiguration } from '@aws-sdk/client-lambda';
import { isUniDateTime } from '@ehmpathy/uni-time';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure, isNotUndefined, type NotUndefined } from 'type-fns';

import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { parseRoleArnIntoRef } from './utils/parseRoleArnIntoRef';

/**
 * .what = input for castIntoDeclaredAwsLambda
 * .why = extends FunctionConfiguration with tags from GetFunctionResponse
 */
export type CastIntoDeclaredAwsLambdaInput = FunctionConfiguration & {
  tags?: Record<string, string>;
};

/**
 * .what = extracts a value from an object or throws
 * .why = provides fail-fast behavior for required fields
 */
const getOrThrow = <T, K extends keyof T>(
  obj: T,
  key: K,
): NotUndefined<T[K]> => {
  const value = obj[key];

  // if its not undefined, return it
  if (isNotUndefined(value)) return value;

  // otherwise, fail fast
  throw new UnexpectedCodePathError(`${String(key)} not found on response`, {
    input: obj,
    key,
  });
};

/**
 * .what = transforms aws sdk FunctionConfiguration into DeclaredAwsLambda
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsLambda = (
  input: CastIntoDeclaredAwsLambdaInput,
): HasReadonly<typeof DeclaredAwsLambda> => {
  // extract codeZipUri from tags (set by setLambda, null if not created by declastruct)
  const { codeZipUri, ...userTags } = input.tags ?? {};

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsLambda.as({
      arn: getOrThrow(input, 'FunctionArn'),
      name: getOrThrow(input, 'FunctionName'),

      handler: getOrThrow(input, 'Handler'),
      codeSha256: getOrThrow(input, 'CodeSha256'),
      codeSize: getOrThrow(input, 'CodeSize'),

      runtime: getOrThrow(input, 'Runtime'),
      timeout: getOrThrow(input, 'Timeout'),
      memory: getOrThrow(input, 'MemorySize'),

      role: parseRoleArnIntoRef(getOrThrow(input, 'Role')),
      updatedAt: isUniDateTime.assure(
        getOrThrow(input, 'LastModified').replace('+0000', 'Z'),
      ),
      envars: getOrThrow(input, 'Environment').Variables ?? {},
      codeZipUri: codeZipUri ?? null,
      tags: Object.keys(userTags).length > 0 ? userTags : undefined,
    }),
    hasReadonly({ of: DeclaredAwsLambda }),
  );
};
