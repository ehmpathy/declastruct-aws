import { asProcedure } from 'as-procedure';
import { HelpfulError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranchProtection } from '../../domain.objects/DeclaredGithubBranchProtection';
import {
  castToDeclaredGithubBranchProtection,
  GithubBranchProtectionResponse,
} from './castToDeclaredGithubBranchProtection';
import { getBranchProtection } from './getBranchProtection';

/**
 * .what = sets a GitHub branch's protection rules: upsert or finsert
 * .why = enables declarative updates of branch protection following declastruct patterns
 */
export const setBranchProtection = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredGithubBranchProtection;
      upsert: DeclaredGithubBranchProtection;
    }>,
    context: ContextGithubApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredGithubBranchProtection>> => {
    const desired = input.finsert ?? input.upsert;

    // get cached GitHub client
    const github = getGithubClient({}, context);

    // check whether it already exists
    const before = await getBranchProtection(
      {
        by: {
          unique: {
            branch: desired.branch,
          },
        },
      },
      context,
    );

    // if it's a finsert and had a before, then return that
    if (before && input.finsert) return before;

    // update the branch protection (always use update since protection is part of branch, not a separate resource)
    try {
      const branchRef = desired.branch as {
        repo: { owner: string; name: string };
        name: string;
      };
      const updated = await github.repos.updateBranchProtection({
        owner: branchRef.repo.owner,
        repo: branchRef.repo.name,
        branch: branchRef.name,
        enforce_admins: desired.enforceAdmins ?? null,
        allow_deletions: desired.allowsDeletions,
        allow_force_pushes: desired.allowsForcePushes,
        required_linear_history: desired.requireLinearHistory,
        block_creations: desired.blockCreations,
        lock_branch: desired.lockBranch,
        allow_fork_syncing: desired.allowForkSyncing,
        required_status_checks: desired.requiredStatusChecks
          ? {
              strict: desired.requiredStatusChecks.strict,
              contexts: desired.requiredStatusChecks.contexts,
            }
          : null,
        required_pull_request_reviews: desired.requiredPullRequestReviews
          ? {
              dismiss_stale_reviews:
                desired.requiredPullRequestReviews.dismissStaleReviews ?? false,
              require_code_owner_reviews:
                desired.requiredPullRequestReviews.requireCodeOwnerReviews ??
                false,
              required_approving_review_count:
                desired.requiredPullRequestReviews
                  .requiredApprovingReviewCount ?? 1,
              dismissal_restrictions: desired.requiredPullRequestReviews
                .dismissalRestrictions
                ? {
                    users:
                      desired.requiredPullRequestReviews.dismissalRestrictions
                        .users,
                    teams:
                      desired.requiredPullRequestReviews.dismissalRestrictions
                        .teams,
                    apps: desired.requiredPullRequestReviews
                      .dismissalRestrictions.apps,
                  }
                : undefined,
            }
          : null,
        restrictions: desired.restrictions
          ? {
              users: desired.restrictions.users ?? [],
              teams: desired.restrictions.teams ?? [],
              apps: desired.restrictions.apps ?? [],
            }
          : null,
        required_conversation_resolution:
          desired.requiredConversationResolution,
      });

      return castToDeclaredGithubBranchProtection({
        response: updated.data as GithubBranchProtectionResponse,
        branch: desired.branch,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new HelpfulError('github.setBranchProtection.update error', {
        cause: error,
      });
    }
  },
);
