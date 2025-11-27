import { UnexpectedCodePathError } from 'helpful-errors';

import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';

/**
 * .what = provides sample GitHub context for testing
 * .why = allows integration tests to access GitHub API with credentials from environment
 */
export const getSampleGithubContext = (): ContextGithubApi => ({
  github: {
    token:
      process.env.GITHUB_TOKEN ??
      UnexpectedCodePathError.throw(
        'GITHUB_TOKEN env var must be set for tests',
        {
          GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        },
      ),
  },
});
