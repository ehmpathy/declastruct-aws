import type { FunctionConfiguration } from '@aws-sdk/client-lambda';
import { isUniDateTime } from '@ehmpathy/uni-time';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure, isPresent } from 'type-fns';

import { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';
import { DeclaredAwsLambdaCode } from '@src/domain.objects/DeclaredAwsLambdaCode';

import { asHashFromBase64 } from './utils/asHashFromBase64';
import { parseRoleArnIntoRef } from './utils/parseRoleArnIntoRef';

/**
 * .what = input for castIntoDeclaredAwsLambda
 * .why = extends FunctionConfiguration with tags from GetFunctionResponse
 */
export type CastIntoDeclaredAwsLambdaInput = FunctionConfiguration & {
  tags?: Record<string, string>;
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

  // parse tags (only include if present)
  const tags = Object.keys(userTags).length > 0 ? userTags : undefined;

  // build code object (null if not created by declastruct)
  const codeHash = asHashFromBase64(assure(input.CodeSha256, isPresent));
  const code = codeZipUri
    ? DeclaredAwsLambdaCode.as({ zipUri: codeZipUri, hash: codeHash })
    : null;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsLambda.as({
      arn: assure(input.FunctionArn, isPresent),
      name: assure(input.FunctionName, isPresent),

      handler: assure(input.Handler, isPresent),
      codeSize: assure(input.CodeSize, isPresent),
      code,

      runtime: assure(input.Runtime, isPresent),
      timeout: assure(input.Timeout, isPresent),
      memory: assure(input.MemorySize, isPresent),

      role: parseRoleArnIntoRef(assure(input.Role, isPresent)),
      updatedAt: isUniDateTime.assure(
        assure(input.LastModified, isPresent).replace('+0000', 'Z'),
      ),
      envars: input.Environment?.Variables ?? {},
      ...(tags !== undefined && { tags }),
    }),
    hasReadonly({ of: DeclaredAwsLambda }),
  );
};
