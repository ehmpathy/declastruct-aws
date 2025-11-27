import { HelpfulError } from 'helpful-errors';
import { HasMetadata } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import { castToDeclaredGithubRepo } from './castToDeclaredGithubRepo';

/**
 * .what = lists GitHub repositories
 * .why = retrieves multiple repos from GitHub API for declarative management
 */
export const getRepos = async (
  input: {
    where?: {
      owner?: string;
    };
    page?: {
      range?: { until: { page: number } };
      limit?: number;
    };
  },
  context: ContextGithubApi & VisualogicContext,
): Promise<HasMetadata<DeclaredGithubRepo>[]> => {
  // get cached GitHub client
  const github = getGithubClient({}, context);

  // execute the GitHub API call
  try {
    const response = await (async () => {
      // if owner is specified, list repos for that org/user
      if (input.where?.owner) {
        return github.repos.listForOrg({
          org: input.where.owner,
          page: input.page?.range?.until.page,
          per_page: input.page?.limit,
        });
      }

      // otherwise, list repos for authenticated user
      return github.repos.listForAuthenticatedUser({
        page: input.page?.range?.until.page,
        per_page: input.page?.limit,
      });
    })();

    const repos = response.data ?? [];
    return repos.map(castToDeclaredGithubRepo);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new HelpfulError('github.getRepos error', { cause: error });
  }
};
