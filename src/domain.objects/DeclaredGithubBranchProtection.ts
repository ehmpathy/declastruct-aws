import { DomainEntity, DomainLiteral, RefByUnique } from 'domain-objects';

import { DeclaredGithubBranch } from './DeclaredGithubBranch';

/**
 * .what = a declarative structure which represents GitHub branch protection rules
 * .why = enables declarative management of branch protection settings following declastruct patterns
 */
export interface DeclaredGithubBranchProtection {
  /**
   * .what = reference to the branch this protection applies to
   * .note = 1:1 relationship - protection is part of branch, not separate resource
   */
  branch: RefByUnique<typeof DeclaredGithubBranch>;

  /**
   * .what = whether to enforce rules for administrators
   */
  enforceAdmins?: boolean;

  /**
   * .what = whether to allow branch deletion
   */
  allowsDeletions?: boolean;

  /**
   * .what = whether to allow force pushes
   */
  allowsForcePushes?: boolean;

  /**
   * .what = whether to require linear history (no merge commits)
   */
  requireLinearHistory?: boolean;

  /**
   * .what = whether to block branch creation matching this pattern
   */
  blockCreations?: boolean;

  /**
   * .what = whether to lock branch (read-only)
   */
  lockBranch?: boolean;

  /**
   * .what = whether to allow fork syncing
   */
  allowForkSyncing?: boolean;

  /**
   * .what = required status check settings
   * .note = null if not configured
   */
  requiredStatusChecks?: {
    /**
     * .what = whether branch must be up to date before merging
     */
    strict: boolean;

    /**
     * .what = required status check context names
     */
    contexts: string[];
  } | null;

  /**
   * .what = required pull request review settings
   * .note = null if not configured
   */
  requiredPullRequestReviews?: {
    /**
     * .what = whether to dismiss stale reviews when new commits are pushed
     */
    dismissStaleReviews?: boolean;

    /**
     * .what = whether to require review from code owners
     */
    requireCodeOwnerReviews?: boolean;

    /**
     * .what = number of required approving reviews
     */
    requiredApprovingReviewCount?: number;

    /**
     * .what = who can dismiss pull request reviews
     */
    dismissalRestrictions?: {
      users?: string[];
      teams?: string[];
      apps?: string[];
    };
  } | null;

  /**
   * .what = who can push to this branch
   * .note = null if no restrictions
   */
  restrictions?: {
    users?: string[];
    teams?: string[];
    apps?: string[];
  } | null;

  /**
   * .what = whether to require signed commits
   */
  requiredSignatures?: boolean;

  /**
   * .what = whether to require conversation resolution before merging
   */
  requiredConversationResolution?: boolean;
}

export class DeclaredGithubBranchProtection
  extends DomainEntity<DeclaredGithubBranchProtection>
  implements DeclaredGithubBranchProtection
{
  public static unique = ['branch'] as const;
  public static nested = {
    branch: RefByUnique<typeof DeclaredGithubBranch>,
    requiredStatusChecks: DomainLiteral,
  };
}
