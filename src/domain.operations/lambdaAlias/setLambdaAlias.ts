import {
  CreateAliasCommand,
  GetAliasCommand,
  LambdaClient,
  UpdateAliasCommand,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import { HasReadonly, RefByUnique } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { DeclaredAwsLambdaVersionDao } from '../../access/daos/DeclaredAwsLambdaVersionDao';
import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { DeclaredAwsLambdaAlias } from '../../domain.objects/DeclaredAwsLambdaAlias';
import { DeclaredAwsLambdaVersion } from '../../domain.objects/DeclaredAwsLambdaVersion';
import { getOneLambda } from '../lambda/getOneLambda';
import { castIntoDeclaredAwsLambdaAlias } from './castIntoDeclaredAwsLambdaAlias';
import { getOneLambdaAlias } from './getOneLambdaAlias';

/**
 * .what = creates or updates a lambda alias
 * .why = enables declarative alias management for version targeting
 *
 * .note
 *   - finsert: create only if not exists, error if exists with different version
 *   - upsert: create or update to point to specified version
 */
export const setLambdaAlias = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsLambdaAlias;
      upsert: DeclaredAwsLambdaAlias;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambdaAlias>> => {
    const aliasDesired = input.finsert ?? input.upsert;

    // resolve lambda ref
    const lambda = await getOneLambda(
      { by: { ref: aliasDesired.lambda } },
      context,
    );

    // failfast if lambda doesn't exist
    if (!lambda)
      UnexpectedCodePathError.throw('lambda not found for alias', {
        lambda: aliasDesired.lambda,
      });

    // resolve version ref
    const version = await DeclaredAwsLambdaVersionDao.get.byRef(
      aliasDesired.version,
      context,
    );

    // failfast if version doesn't exist
    if (!version)
      UnexpectedCodePathError.throw('version not found for alias', {
        version: aliasDesired.version,
      });

    // get alias before
    const before = await getOneLambdaAlias(
      {
        by: {
          unique: { lambda: aliasDesired.lambda, name: aliasDesired.name },
        },
      },
      context,
    );

    // create lambda client
    const lambdaClient = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // if exists + finsert, verify same version or error
    if (before && input.finsert) {
      // get current version the alias points to from aws
      const currentResponse = await lambdaClient.send(
        new GetAliasCommand({
          FunctionName: lambda.name,
          Name: aliasDesired.name,
        }),
      );

      // if pointing to different version, error
      if (currentResponse.FunctionVersion !== version.version) {
        BadRequestError.throw('alias exists with different version', {
          alias: aliasDesired.name,
          versionBefore: currentResponse.FunctionVersion,
          requestedVersion: version.version,
        });
      }

      return before;
    }

    // build routing config for aws
    const awsRoutingConfig = aliasDesired.routingConfig
      ?.additionalVersionWeights
      ? {
          AdditionalVersionWeights:
            aliasDesired.routingConfig.additionalVersionWeights,
        }
      : undefined;

    // create or update alias
    const result = await (async () => {
      if (before) {
        // update alias
        return lambdaClient.send(
          new UpdateAliasCommand({
            FunctionName: lambda.name,
            Name: aliasDesired.name,
            FunctionVersion: version.version,
            Description: aliasDesired.description,
            RoutingConfig: awsRoutingConfig,
          }),
        );
      }

      // create new alias
      return lambdaClient.send(
        new CreateAliasCommand({
          FunctionName: lambda.name,
          Name: aliasDesired.name,
          FunctionVersion: version.version,
          Description: aliasDesired.description,
          RoutingConfig: awsRoutingConfig,
        }),
      );
    })();

    return castIntoDeclaredAwsLambdaAlias({
      aliasConfig: result,
      lambda: aliasDesired.lambda,
      version: aliasDesired.version,
    });
  },
);
