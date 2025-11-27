import { asProcedure } from 'as-procedure';
import { RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import { castToDeclaredGithubRepo } from './castToDeclaredGithubRepo';

/**
 * .what = gets a GitHub repository
 * .why = retrieves current state of a repo from GitHub API for declarative management
 */
export const getRepo = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredGithubRepo>;
      }>;
    },
    context: ContextGithubApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredGithubRepo> | null> => {
    // get cached GitHub client
    const github = getGithubClient({}, context);

    // determine owner and repo name from input
    const { owner, repo } = (() => {
      if (input.by.unique)
        return { owner: input.by.unique.owner, repo: input.by.unique.name };

      UnexpectedCodePathError.throw('not referenced by unique. how not?', {
        input,
      });
    })();

    // execute the GitHub API call
    try {
      const response = await github.repos.get({ owner, repo });
      return castToDeclaredGithubRepo(response.data);
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // return null for 404/not found
      if (error.message.includes('Not Found')) return null;

      // throw helpful error for all other failures
      throw new HelpfulError('github.getRepo error', { cause: error });
    }
  },
);
