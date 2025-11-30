import type { AliasConfiguration } from '@aws-sdk/client-lambda';
import { HasReadonly, hasReadonly, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { DeclaredAwsLambdaAlias } from '../../domain.objects/DeclaredAwsLambdaAlias';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';

/**
 * .what = transforms aws sdk AliasConfiguration into DeclaredAwsLambdaAlias
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsLambdaAlias = (input: {
  aliasConfig: AliasConfiguration;
  lambda: RefByUnique<typeof DeclaredAwsLambda>;
  version: RefByUnique<typeof DeclaredAwsLambdaVersion>;
}): HasReadonly<typeof DeclaredAwsLambdaAlias> => {
  // failfast if alias name is not defined
  if (!input.aliasConfig.Name)
    UnexpectedCodePathError.throw(
      'alias config lacks name; cannot cast into domain object',
      {
        input,
      },
    );

  // failfast if arn is not defined
  if (!input.aliasConfig.AliasArn)
    UnexpectedCodePathError.throw(
      'alias config lacks arn; cannot cast into domain object',
      {
        input,
      },
    );

  // build routing config if present
  const routingConfig = input.aliasConfig.RoutingConfig
    ?.AdditionalVersionWeights
    ? {
        additionalVersionWeights:
          input.aliasConfig.RoutingConfig.AdditionalVersionWeights,
      }
    : undefined;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsLambdaAlias.as({
      arn: input.aliasConfig.AliasArn,
      name: input.aliasConfig.Name,
      lambda: input.lambda,
      version: input.version,
      description: input.aliasConfig.Description,
      routingConfig,
    }),
    hasReadonly({ of: DeclaredAwsLambdaAlias }),
  );
};
