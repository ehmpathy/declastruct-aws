import {
  CreateAccountAliasCommand,
  DeleteAccountAliasCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsAccountAlias } from '@src/domain.objects/DeclaredAwsAccountAlias';

import { asAccountAliasErrorFromAwsError } from './asAccountAliasErrorFromAwsError';
import { castIntoDeclaredAwsAccountAlias } from './castIntoDeclaredAwsAccountAlias';
import { getOneAccountAlias } from './getOneAccountAlias';
import { validateAccountAliasFormat } from './validateAccountAliasFormat';

/**
 * .what = creates or updates the account alias for the current credentials
 * .why = enables declarative control of account alias with idempotent semantics
 * .note
 *   - validates alias format before any aws api call
 *   - idempotent: returns current alias if already set to same value
 *   - upsert: deletes old alias then creates new (aws has no update api)
 *   - alias must be unique across all accounts in aws partition
 */
export const setAccountAlias = asProcedure(
  async (
    input: {
      upsert: {
        alias: string;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsAccountAlias>> => {
    // validate alias format before any aws call
    validateAccountAliasFormat({ alias: input.upsert.alias });

    // get the current alias
    const foundBefore = await getOneAccountAlias(
      { by: { auth: true } },
      context,
    );

    // if same alias, return current (idempotent)
    if (foundBefore && foundBefore.alias === input.upsert.alias)
      return foundBefore;

    // declare the client
    const client = new IAMClient({
      region: context.aws.credentials.region,
    });

    // if different alias present, delete it first
    // note: aws has no update api — upsert = delete + create
    if (foundBefore) {
      context.log.debug('setAccountAlias: delete old alias before create', {
        oldAlias: foundBefore.alias,
        newAlias: input.upsert.alias,
      });

      await client.send(
        new DeleteAccountAliasCommand({
          AccountAlias: foundBefore.alias,
        }),
      );
    }

    try {
      // create the new alias
      await client.send(
        new CreateAccountAliasCommand({
          AccountAlias: input.upsert.alias,
        }),
      );

      // return the new alias
      return castIntoDeclaredAwsAccountAlias({ alias: input.upsert.alias });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // transform aws error into domain error (unit tested separately)
      // note: function always throws; return satisfies typescript
      return asAccountAliasErrorFromAwsError({
        error,
        alias: input.upsert.alias,
        previousAlias: foundBefore?.alias ?? null,
      });
    }
  },
);
