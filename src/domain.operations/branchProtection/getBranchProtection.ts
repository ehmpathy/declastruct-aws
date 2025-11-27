import { asProcedure } from 'as-procedure';
import { RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranchProtection } from '../../domain.objects/DeclaredGithubBranchProtection';
import { castToDeclaredGithubBranchProtection } from './castToDeclaredGithubBranchProtection';

/**
 * .what = gets a GitHub branch's protection rules
 * .why = retrieves current protection state from GitHub API for declarative management
 */
export const getBranchProtection = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredGithubBranchProtection>;
      }>;
    },
    context: ContextGithubApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredGithubBranchProtection> | null> => {
    // get cached GitHub client
    const github = getGithubClient({}, context);

    // determine owner, repo, and branch name from input
    const { branch } = (() => {
      if (input.by.unique) {
        return {
          branch: input.by.unique.branch,
        };
      }

      UnexpectedCodePathError.throw('not referenced by unique. how not?', {
        input,
      });
    })();

    // execute the GitHub API call
    try {
      const branchRef = branch as {
        repo: { owner: string; name: string };
        name: string;
      };
      const response = await github.repos.getBranchProtection({
        owner: branchRef.repo.owner,
        repo: branchRef.repo.name,
        branch: branchRef.name,
      });
      return castToDeclaredGithubBranchProtection({
        response: response.data,
        branch,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // return null for 404/not found (no protection exists)
      if (
        error.message.includes('Not Found') ||
        error.message.includes('Branch not protected') ||
        error.message.includes('Branch not found')
      )
        return null;

      // throw helpful error for all other failures
      throw new HelpfulError('github.getBranchProtection error', {
        cause: error,
      });
    }
  },
);
