import { FunctionConfiguration } from '@aws-sdk/client-lambda';
import { isUniDateTime } from '@ehmpathy/uni-time';
import { UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, isNotUndefined, NotUndefined } from 'type-fns';

import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';

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

export const castToDeclaredAwsLambda = (
  input: FunctionConfiguration,
): HasMetadata<DeclaredAwsLambda> => {
  return new DeclaredAwsLambda({
    arn: getOrThrow(input, 'FunctionArn'),
    name: getOrThrow(input, 'FunctionName'),
    qualifier: getOrThrow(input, 'Version'),

    handler: getOrThrow(input, 'Handler'),
    codeSha256: getOrThrow(input, 'CodeSha256'),
    codeSize: getOrThrow(input, 'CodeSize'),

    runtime: getOrThrow(input, 'Runtime'),
    timeout: getOrThrow(input, 'Timeout'),
    memory: getOrThrow(input, 'MemorySize'),

    role: getOrThrow(input, 'Role'),
    updatedAt: isUniDateTime.assure(
      getOrThrow(input, 'LastModified').replace('+0000', 'Z'),
    ),
    envars: getOrThrow(input, 'Environment').Variables ?? {},
  }) as HasMetadata<DeclaredAwsLambda>;
};
