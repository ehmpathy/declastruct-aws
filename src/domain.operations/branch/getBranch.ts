import { asProcedure } from 'as-procedure';
import { RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranch } from '../../domain.objects/DeclaredGithubBranch';
import { castToDeclaredGithubBranch } from './castToDeclaredGithubBranch';

/**
 * .what = gets a GitHub branch
 * .why = retrieves current state of a branch from GitHub API for declarative management
 */
export const getBranch = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredGithubBranch>;
      }>;
    },
    context: ContextGithubApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredGithubBranch> | null> => {
    // get cached GitHub client
    const github = getGithubClient({}, context);

    // determine owner, repo, and branch name from input
    const { repo, branch } = (() => {
      if (input.by.unique) {
        return {
          repo: input.by.unique.repo,
          branch: input.by.unique.name,
        };
      }

      UnexpectedCodePathError.throw('not referenced by unique. how not?', {
        input,
      });
    })();

    // execute the GitHub API call
    try {
      const response = await github.repos.getBranch({
        owner: repo.owner,
        repo: repo.name,
        branch,
      });
      return castToDeclaredGithubBranch({
        branch: response.data,
        repo: input.by.unique.repo,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // return null for 404/not found
      if (
        error.message.includes('Not Found') ||
        error.message.includes('Branch not found')
      )
        return null;

      // throw helpful error for all other failures
      throw new HelpfulError('github.getBranch error', { cause: error });
    }
  },
);
