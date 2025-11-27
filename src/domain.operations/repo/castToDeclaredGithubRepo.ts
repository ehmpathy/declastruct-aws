import { asUniDateTime } from '@ehmpathy/uni-time';
import { Endpoints } from '@octokit/types';
import { UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, isNotUndefined, NotUndefined } from 'type-fns';

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

type GithubRepoResponse =
  | Endpoints['GET /repos/{owner}/{repo}']['response']['data']
  | Endpoints['GET /user/repos']['response']['data'][number]
  | Endpoints['GET /orgs/{org}/repos']['response']['data'][number];

/**
 * .what = casts GitHub API repository response to DeclaredGithubRepo
 * .why = transforms external API shape to our domain model with type safety and validation
 */
export const castToDeclaredGithubRepo = (
  input: GithubRepoResponse,
): HasMetadata<DeclaredGithubRepo> => {
  const visibility =
    (input.visibility as 'public' | 'private' | 'internal') ?? 'public';

  return DeclaredGithubRepo.as({
    id: getOrThrow(input, 'id'),
    owner: getOrThrow(getOrThrow(input, 'owner'), 'login'),
    name: getOrThrow(input, 'name'),
    description: input.description ?? null,
    homepage: input.homepage ?? null,
    private: input.private ?? visibility !== 'public',
    visibility,
    archived: input.archived ?? false,
    createdAt: input.created_at ? asUniDateTime(input.created_at) : undefined,
    updatedAt: input.updated_at ? asUniDateTime(input.updated_at) : undefined,
  }) as HasMetadata<DeclaredGithubRepo>;
};
