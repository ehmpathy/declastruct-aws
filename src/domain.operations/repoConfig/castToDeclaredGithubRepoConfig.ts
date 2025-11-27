import { Endpoints } from '@octokit/types';
import { refByUnique, RefByUnique } from 'domain-objects';
import { HasMetadata } from 'type-fns';

import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import { DeclaredGithubRepoConfig } from '../../domain.objects/DeclaredGithubRepoConfig';

type GithubRepoResponse =
  Endpoints['GET /repos/{owner}/{repo}']['response']['data'];

/**
 * .what = casts GitHub API repository response to DeclaredGithubRepoConfig
 * .why = transforms external API shape to our repo config domain model with type safety and validation
 */
export const castToDeclaredGithubRepoConfig = (input: {
  response: GithubRepoResponse;
  repo: RefByUnique<typeof DeclaredGithubRepo>;
}): HasMetadata<DeclaredGithubRepoConfig> => {
  return DeclaredGithubRepoConfig.as({
    repo:
      input.repo instanceof DeclaredGithubRepo
        ? refByUnique<typeof DeclaredGithubRepo>(input.repo)
        : input.repo,
    hasIssues: input.response.has_issues,
    hasProjects: input.response.has_projects,
    hasWiki: input.response.has_wiki,
    hasDownloads: input.response.has_downloads,
    isTemplate: input.response.is_template,
    defaultBranch: input.response.default_branch,
    allowSquashMerge: input.response.allow_squash_merge,
    allowMergeCommit: input.response.allow_merge_commit,
    allowRebaseMerge: input.response.allow_rebase_merge,
    allowAutoMerge: input.response.allow_auto_merge,
    deleteBranchOnMerge: input.response.delete_branch_on_merge,
    allowUpdateBranch: input.response.allow_update_branch,
    squashMergeCommitTitle: input.response.squash_merge_commit_title as
      | 'PR_TITLE'
      | 'COMMIT_OR_PR_TITLE'
      | undefined,
    squashMergeCommitMessage: input.response.squash_merge_commit_message as
      | 'PR_BODY'
      | 'COMMIT_MESSAGES'
      | 'BLANK'
      | undefined,
    mergeCommitTitle: input.response.merge_commit_title as
      | 'PR_TITLE'
      | 'MERGE_MESSAGE'
      | undefined,
    mergeCommitMessage: input.response.merge_commit_message as
      | 'PR_TITLE'
      | 'PR_BODY'
      | 'BLANK'
      | undefined,
    webCommitSignoffRequired: input.response.web_commit_signoff_required,
  }) as HasMetadata<DeclaredGithubRepoConfig>;
};
