import { DomainEntity, RefByUnique } from 'domain-objects';

import { DeclaredGithubRepo } from './DeclaredGithubRepo';

/**
 * .what = a declarative structure which represents a GitHub repository's configuration
 * .why = enables declarative management of GitHub repo config settings following declastruct patterns
 */
export interface DeclaredGithubRepoConfig {
  /**
   * .what = reference to the repository this configuration belongs to
   * .note = 1:1 relationship - config is part of repo, not separate resource
   */
  repo: RefByUnique<typeof DeclaredGithubRepo>;

  /**
   * .what = name of the default branch
   * .note = e.g., 'main', 'master', 'develop'
   */
  defaultBranch?: string;

  /**
   * .what = whether issues are enabled
   */
  hasIssues?: boolean;

  /**
   * .what = whether projects are enabled
   */
  hasProjects?: boolean;

  /**
   * .what = whether wiki is enabled
   */
  hasWiki?: boolean;

  /**
   * .what = whether downloads are enabled
   */
  hasDownloads?: boolean;

  /**
   * .what = whether this is a template repository
   */
  isTemplate?: boolean;

  /**
   * .what = whether squash merging is allowed
   */
  allowSquashMerge?: boolean;

  /**
   * .what = whether merge commits are allowed
   */
  allowMergeCommit?: boolean;

  /**
   * .what = whether rebase merging is allowed
   */
  allowRebaseMerge?: boolean;

  /**
   * .what = whether auto-merge is allowed
   * .note = may be undefined
   */
  allowAutoMerge?: boolean;

  /**
   * .what = whether to delete head branches after PRs are merged
   * .note = may be undefined
   */
  deleteBranchOnMerge?: boolean;

  /**
   * .what = whether to allow updating branches with latest base branch
   * .note = may be undefined
   */
  allowUpdateBranch?: boolean;

  /**
   * .what = default commit title for squash merges
   * .note = may be undefined
   */
  squashMergeCommitTitle?: 'PR_TITLE' | 'COMMIT_OR_PR_TITLE';

  /**
   * .what = default commit message for squash merges
   * .note = may be undefined
   */
  squashMergeCommitMessage?: 'PR_BODY' | 'COMMIT_MESSAGES' | 'BLANK';

  /**
   * .what = default commit title for merge commits
   * .note = may be undefined
   */
  mergeCommitTitle?: 'PR_TITLE' | 'MERGE_MESSAGE';

  /**
   * .what = default commit message for merge commits
   * .note = may be undefined
   */
  mergeCommitMessage?: 'PR_TITLE' | 'PR_BODY' | 'BLANK';

  /**
   * .what = whether web commit signoff is required
   * .note = may be undefined
   */
  webCommitSignoffRequired?: boolean;
}

export class DeclaredGithubRepoConfig
  extends DomainEntity<DeclaredGithubRepoConfig>
  implements DeclaredGithubRepoConfig
{
  public static unique = ['repo'] as const;
  public static nested = {
    repo: RefByUnique<typeof DeclaredGithubRepo>,
  };
}
