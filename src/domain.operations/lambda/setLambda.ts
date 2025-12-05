import {
  CreateFunctionCommand,
  type CreateFunctionRequest,
  LambdaClient,
  type UpdateFunctionCodeRequest,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import * as fs from 'fs/promises';
import { BadRequestError } from 'helpful-errors';
import { resolve } from 'path';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { castIntoDeclaredAwsLambda } from './castIntoDeclaredAwsLambda';
import { getOneLambda } from './getOneLambda';

/**
 * .what = sets a lambda: upsert or finsert
 */
export const setLambda = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsLambda;
      upsert: DeclaredAwsLambda;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambda>> => {
    const lambdaDesired = input.finsert ?? input.upsert;
    const awsLambdaSdk = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // check whether it already exists
    const before = await getOneLambda(
      {
        by: {
          unique: {
            name: lambdaDesired.name,
          },
        },
      },
      context,
    );

    // if it's a finsert and had a before, then return that
    if (before && input.finsert) return before;

    // fail fast if codeZipUri is not provided
    if (!lambdaDesired.codeZipUri)
      throw new BadRequestError('codeZipUri is required to set a lambda', {
        lambdaDesired,
      });

    // lookup the base64 of the zip at that uri
    const codeZipBuffer = await fs.readFile(resolve(lambdaDesired.codeZipUri));

    // construct role ARN from RefByUnique name
    const roleArn = `arn:aws:iam::${context.aws.credentials.account}:role/${lambdaDesired.role.name}`;

    // otherwise, declare the desired attributes in aws's schema
    const setRequest: CreateFunctionRequest & UpdateFunctionCodeRequest = {
      FunctionName: lambdaDesired.name,
      Timeout: lambdaDesired.timeout,
      MemorySize: lambdaDesired.memory,
      Role: roleArn,
      Handler: lambdaDesired.handler,
      Runtime: lambdaDesired.runtime,
      Environment: lambdaDesired.envars
        ? { Variables: lambdaDesired.envars }
        : undefined,
      Code: {
        ZipFile: codeZipBuffer,
      },
      Tags: {
        ...lambdaDesired.tags,
        codeZipUri: lambdaDesired.codeZipUri,
      },
      Publish: true,
    };

    // if its an upsert and had a before, then this requires an update operation
    if (before && input.upsert) {
      const updated = await awsLambdaSdk.send(
        new UpdateFunctionConfigurationCommand(setRequest),
      );
      return castIntoDeclaredAwsLambda(updated);
    }

    // otherwise, create it
    const created = await awsLambdaSdk.send(
      new CreateFunctionCommand(setRequest),
    );

    return castIntoDeclaredAwsLambda(created);
  },
);
