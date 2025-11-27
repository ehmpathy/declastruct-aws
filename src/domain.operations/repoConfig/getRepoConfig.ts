import { asProcedure } from 'as-procedure';
import { RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepoConfig } from '../../domain.objects/DeclaredGithubRepoConfig';
import { castToDeclaredGithubRepoConfig } from './castToDeclaredGithubRepoConfig';

/**
 * .what = gets a GitHub repository's configuration
 * .why = retrieves current config state of a repo from GitHub API for declarative management
 */
export const getRepoConfig = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredGithubRepoConfig>;
      }>;
    },
    context: ContextGithubApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredGithubRepoConfig> | null> => {
    // get cached GitHub client
    const github = getGithubClient({}, context);

    // determine owner and repo name from input
    const { repo } = (() => {
      if (input.by.unique) {
        return {
          repo: input.by.unique.repo,
        };
      }

      UnexpectedCodePathError.throw('not referenced by unique. how not?', {
        input,
      });
    })();

    // execute the GitHub API call
    try {
      const response = await github.repos.get({
        owner: repo.owner,
        repo: repo.name,
      });
      return castToDeclaredGithubRepoConfig({
        response: response.data,
        repo,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // return null for 404/not found
      if (error.message.includes('Not Found')) return null;

      // throw helpful error for all other failures
      throw new HelpfulError('github.getRepoConfig error', { cause: error });
    }
  },
);
