import {
  CreateFunctionCommand,
  type CreateFunctionRequest,
  LambdaClient,
  ResourceConflictException,
  UpdateFunctionCodeCommand,
  type UpdateFunctionCodeRequest,
  UpdateFunctionConfigurationCommand,
  waitUntilFunctionUpdatedV2,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import * as fs from 'fs/promises';
import { BadRequestError } from 'helpful-errors';
import { resolve } from 'path';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsLambda } from '@src/domain.objects/DeclaredAwsLambda';

import { castIntoDeclaredAwsLambda } from './castIntoDeclaredAwsLambda';
import { getOneLambda } from './getOneLambda';

/**
 * .what = sets a lambda: upsert or findsert
 */
export const setLambda = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsLambda;
      upsert: DeclaredAwsLambda;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsLambda>> => {
    const lambdaDesired = input.findsert ?? input.upsert;
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

    // if it's a findsert and had a before, then return that
    if (before && input.findsert) return before;

    // fail fast if code is not provided
    if (!lambdaDesired.code)
      throw new BadRequestError('code is required to set a lambda', {
        lambdaDesired,
      });

    // lookup the buffer of the zip at that uri
    const codeZipBuffer = await fs.readFile(resolve(lambdaDesired.code.zipUri));

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
        codeZipUri: lambdaDesired.code.zipUri,
      },
      Publish: true,
    };

    // if its an upsert and had a before, then this requires an update operation
    if (before && input.upsert) {
      // wait for function to be ready before update
      await waitUntilFunctionUpdatedV2(
        { client: awsLambdaSdk, maxWaitTime: 60 },
        { FunctionName: lambdaDesired.name },
      );

      // update config
      await awsLambdaSdk.send(
        new UpdateFunctionConfigurationCommand(setRequest),
      );

      // update code only if hash changed
      const codeHashChanged = before.code?.hash !== lambdaDesired.code.hash;
      if (codeHashChanged) {
        // wait for config update to complete before code update
        await waitUntilFunctionUpdatedV2(
          { client: awsLambdaSdk, maxWaitTime: 60 },
          { FunctionName: lambdaDesired.name },
        );

        await awsLambdaSdk.send(
          new UpdateFunctionCodeCommand({
            FunctionName: lambdaDesired.name,
            ZipFile: codeZipBuffer,
            Publish: true,
          }),
        );
      }

      // fetch full state after update
      const updated = await getOneLambda(
        { by: { unique: { name: lambdaDesired.name } } },
        context,
      );
      if (!updated)
        throw new BadRequestError('lambda disappeared after update', {
          lambdaDesired,
        });
      return updated;
    }

    // otherwise, create it
    try {
      const created = await awsLambdaSdk.send(
        new CreateFunctionCommand(setRequest),
      );
      return castIntoDeclaredAwsLambda(created);
    } catch (error) {
      // handle race condition: if findsert and lambda was created between our check and create,
      // fetch and return the foundAfter lambda (makes findsert idempotent even under race conditions)
      if (error instanceof ResourceConflictException && input.findsert) {
        const foundAfter = await getOneLambda(
          { by: { unique: { name: lambdaDesired.name } } },
          context,
        );
        if (foundAfter) return foundAfter;
      }
      throw error;
    }
  },
);
