import type { FunctionConfiguration } from '@aws-sdk/client-lambda';
import { HasReadonly, hasReadonly, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { parseRoleArnIntoRef } from '../lambda/utils/parseRoleArnIntoRef';
import { calcConfigSha256 } from './utils/calcConfigSha256';

/**
 * .what = transforms aws sdk FunctionConfiguration into DeclaredAwsLambdaVersion
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsLambdaVersion = (input: {
  functionConfig: FunctionConfiguration;
  lambda: RefByUnique<typeof DeclaredAwsLambda>;
}): HasReadonly<typeof DeclaredAwsLambdaVersion> => {
  // failfast if version is not defined
  if (!input.functionConfig.Version)
    UnexpectedCodePathError.throw(
      'function config lacks version; cannot cast into domain object',
      {
        input,
      },
    );

  // failfast if arn is not defined
  if (!input.functionConfig.FunctionArn)
    UnexpectedCodePathError.throw(
      'function config lacks arn; cannot cast into domain object',
      {
        input,
      },
    );

  // failfast if codeSha256 is not defined
  if (!input.functionConfig.CodeSha256)
    UnexpectedCodePathError.throw(
      'function config lacks codeSha256; cannot cast into domain object',
      {
        input,
      },
    );

  // failfast if required config fields are missing
  if (!input.functionConfig.Handler)
    UnexpectedCodePathError.throw(
      'function config lacks handler; cannot compute configSha256',
      { input },
    );
  if (!input.functionConfig.Runtime)
    UnexpectedCodePathError.throw(
      'function config lacks runtime; cannot compute configSha256',
      { input },
    );
  if (!input.functionConfig.MemorySize)
    UnexpectedCodePathError.throw(
      'function config lacks memorySize; cannot compute configSha256',
      { input },
    );
  if (!input.functionConfig.Timeout)
    UnexpectedCodePathError.throw(
      'function config lacks timeout; cannot compute configSha256',
      { input },
    );
  if (!input.functionConfig.Role)
    UnexpectedCodePathError.throw(
      'function config lacks role; cannot compute configSha256',
      { input },
    );

  // compute configSha256 from function configuration
  const configSha256 = calcConfigSha256({
    of: {
      handler: input.functionConfig.Handler,
      runtime: input.functionConfig.Runtime,
      memory: input.functionConfig.MemorySize,
      timeout: input.functionConfig.Timeout,
      role: parseRoleArnIntoRef(input.functionConfig.Role),
      envars: input.functionConfig.Environment?.Variables ?? {},
    },
  });

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsLambdaVersion.as({
      arn: input.functionConfig.FunctionArn,
      version: input.functionConfig.Version,
      lambda: input.lambda,
      codeSha256: input.functionConfig.CodeSha256,
      configSha256,
      // normalize empty string to undefined to avoid spurious diffs
      ...(input.functionConfig.Description && {
        description: input.functionConfig.Description,
      }),
    }),
    hasReadonly({ of: DeclaredAwsLambdaVersion }),
  );
};
