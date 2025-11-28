import {
  CreateFunctionCommand,
  CreateFunctionRequest,
  LambdaClient,
  UpdateFunctionCodeRequest,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import { asProcedure } from 'as-procedure';
import * as fs from 'fs/promises';
import { resolve } from 'path';
import { PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsLambda } from '../../domain.objects/DeclaredAwsLambda';
import { castToDeclaredAwsLambda } from './castToDeclaredAwsLambda';
import { getLambda } from './getLambda';

/**
 * .what = sets a lambda: upsert or finsert
 */
export const setLambda = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsLambda & { codeZipUri: string };
      upsert: DeclaredAwsLambda & { codeZipUri: string };
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsLambda> => {
    const lambdaDesired = input.finsert ?? input.upsert;
    const awsLambdaSdk = new LambdaClient({
      region: context.aws.credentials.region,
    });

    // check whether it already exists
    const before = await getLambda(
      {
        by: {
          unique: {
            name: lambdaDesired.name,
            qualifier: lambdaDesired.qualifier,
          },
        },
      },
      context,
    );

    // if it's a finsert and had a before, then return that
    if (before && input.finsert) return before;

    // lookup the base64 of the zip at that uri
    // const codeZipBase64 = lambdaDesired.codeZipUri;
    // const codeZipBuffer = Buffer.from(codeZipBase64, 'base64');
    const codeZipBuffer = await fs.readFile(resolve(lambdaDesired.codeZipUri));

    // otherwise, declare the desired attributes in aws's schema
    const setRequest: CreateFunctionRequest & UpdateFunctionCodeRequest = {
      FunctionName: lambdaDesired.name,
      Timeout: lambdaDesired.timeout,
      MemorySize: lambdaDesired.memory,
      Role: lambdaDesired.role,
      Handler: lambdaDesired.handler,
      Runtime: lambdaDesired.runtime,
      Environment: lambdaDesired.envars
        ? { Variables: lambdaDesired.envars }
        : undefined,
      Code: {
        ZipFile: codeZipBuffer,
      },
      Tags: {
        codeZipUri: lambdaDesired.codeZipUri,
      },
      Publish: true,
    };

    // if its an upsert and had a before, then this requires an update operation
    if (before && input.upsert) {
      const updated = await awsLambdaSdk.send(
        new UpdateFunctionConfigurationCommand(setRequest),
      );
      return castToDeclaredAwsLambda(updated);
    }

    // otherwise, create it
    const created = await awsLambdaSdk.send(
      new CreateFunctionCommand(setRequest),
    );

    return castToDeclaredAwsLambda(created);
  },
);
