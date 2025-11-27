import { RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import { getBranch } from './getBranch';

/**
 * .what = gets the commit SHA of a repository's default branch
 * .why = enables creating branches from the default branch when no commit SHA is specified
 */
export const getBranchCommitShaByRepoDefault = async (
  input: {
    repo: RefByUnique<typeof DeclaredGithubRepo>;
  },
  context: ContextGithubApi & VisualogicContext,
): Promise<string> => {
  // get cached GitHub client
  const github = getGithubClient({}, context);

  // get the repository to find its default branch
  const repoResponse = await github.repos.get({
    owner: input.repo.owner,
    repo: input.repo.name,
  });

  const defaultBranch = repoResponse.data.default_branch;

  // get the default branch to find its commit SHA
  const defaultBranchData = await getBranch(
    {
      by: {
        unique: {
          repo: input.repo,
          name: defaultBranch,
        },
      },
    },
    context,
  );

  if (!defaultBranchData?.commit?.sha) {
    UnexpectedCodePathError.throw('default branch has no commit', {
      defaultBranch,
    });
  }

  return defaultBranchData.commit.sha;
};
