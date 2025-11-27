import { RefByUnique } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import { HasMetadata } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranch } from '../../domain.objects/DeclaredGithubBranch';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import { castToDeclaredGithubBranch } from './castToDeclaredGithubBranch';

/**
 * .what = lists GitHub branches for a repository
 * .why = retrieves multiple branches from GitHub API for declarative management
 */
export const getBranches = async (
  input: {
    where: {
      repo: RefByUnique<typeof DeclaredGithubRepo>;
    };
    page?: {
      range?: { until: { page: number } };
      limit?: number;
    };
  },
  context: ContextGithubApi & VisualogicContext,
): Promise<HasMetadata<DeclaredGithubBranch>[]> => {
  // get cached GitHub client
  const github = getGithubClient({}, context);

  // execute the GitHub API call
  try {
    const response = await github.repos.listBranches({
      owner: input.where.repo.owner,
      repo: input.where.repo.name,
      page: input.page?.range?.until.page,
      per_page: input.page?.limit,
    });

    const branches = response.data ?? [];
    return branches.map((branch) =>
      castToDeclaredGithubBranch({ branch, repo: input.where.repo }),
    );
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // throw helpful error for all failures
    throw new HelpfulError('github.getBranches error', { cause: error });
  }
};
