import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';

/**
 * .what = provides sample repo for testing
 * .why = allows integration tests to use a real GitHub repo for testing operations
 */
export const getSampleRepo = (input: {
  owner: string;
  name: string;
}): DeclaredGithubRepo =>
  DeclaredGithubRepo.as({
    owner: input.owner,
    name: input.name,
    description: null,
    visibility: 'public',
  });
