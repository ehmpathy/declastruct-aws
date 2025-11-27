/**
 * .what = context object for GitHub API operations
 * .why = provides authentication credentials for GitHub API calls
 */
export interface ContextGithubApi {
  github: {
    token: string; // GitHub personal access token or GitHub App token
  };
}
