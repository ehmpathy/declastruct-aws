import { Endpoints } from '@octokit/types';
import { refByUnique, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, isNotUndefined, NotUndefined } from 'type-fns';

import { DeclaredGithubBranch } from '../../domain.objects/DeclaredGithubBranch';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';

/**
 * .what = extracts required value from object or throws
 * .why = ensures type safety and fail-fast behavior for missing required fields
 */
const getOrThrow = <T, K extends keyof T>(
  obj: T,
  key: K,
): NotUndefined<T[K]> => {
  const value = obj[key];

  // if its not undefined, return it
  if (isNotUndefined(value)) return value;

  // otherwise, fail fast
  UnexpectedCodePathError.throw(`${String(key)} not found on response`, {
    input: obj,
    key,
  });
};

type GithubBranchResponse =
  | Endpoints['GET /repos/{owner}/{repo}/branches/{branch}']['response']['data']
  | Endpoints['GET /repos/{owner}/{repo}/branches']['response']['data'][number];

/**
 * .what = casts GitHub API branch response to DeclaredGithubBranch
 * .why = transforms external API shape to our domain model with type safety and validation
 */
export const castToDeclaredGithubBranch = (input: {
  branch: GithubBranchResponse;
  repo: RefByUnique<typeof DeclaredGithubRepo>;
}): HasMetadata<DeclaredGithubBranch> => {
  return DeclaredGithubBranch.as({
    name: getOrThrow(input.branch, 'name'),
    repo:
      input.repo instanceof DeclaredGithubRepo
        ? refByUnique<typeof DeclaredGithubRepo>(input.repo)
        : input.repo,
    commit: { sha: getOrThrow(getOrThrow(input.branch, 'commit'), 'sha') },
    protected: input.branch.protected,
  }) as HasMetadata<DeclaredGithubBranch>;
};
