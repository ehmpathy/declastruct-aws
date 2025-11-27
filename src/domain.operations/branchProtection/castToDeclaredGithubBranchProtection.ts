import { Endpoints } from '@octokit/types';
import { refByUnique, RefByUnique } from 'domain-objects';
import { HasMetadata } from 'type-fns';

import { DeclaredGithubBranch } from '../../domain.objects/DeclaredGithubBranch';
import { DeclaredGithubBranchProtection } from '../../domain.objects/DeclaredGithubBranchProtection';

export type GithubBranchProtectionResponse =
  Endpoints['GET /repos/{owner}/{repo}/branches/{branch}/protection']['response']['data'];

/**
 * .what = casts GitHub API branch protection response to DeclaredGithubBranchProtection
 * .why = transforms external API shape to our branch protection domain model with type safety and validation
 */
export const castToDeclaredGithubBranchProtection = (input: {
  response: GithubBranchProtectionResponse;
  branch: RefByUnique<typeof DeclaredGithubBranch>;
}): HasMetadata<DeclaredGithubBranchProtection> => {
  return DeclaredGithubBranchProtection.as({
    branch:
      input.branch instanceof DeclaredGithubBranch
        ? refByUnique<typeof DeclaredGithubBranch>(input.branch)
        : input.branch,
    enforceAdmins: input.response.enforce_admins?.enabled,
    allowsDeletions: input.response.allow_deletions?.enabled,
    allowsForcePushes: input.response.allow_force_pushes?.enabled,
    requireLinearHistory: input.response.required_linear_history?.enabled,
    blockCreations: input.response.block_creations?.enabled,
    lockBranch: input.response.lock_branch?.enabled,
    allowForkSyncing: input.response.allow_fork_syncing?.enabled,
    requiredStatusChecks: input.response.required_status_checks
      ? {
          strict: input.response.required_status_checks.strict ?? false,
          contexts: input.response.required_status_checks.contexts ?? [],
        }
      : null,
    requiredPullRequestReviews: input.response.required_pull_request_reviews
      ? {
          dismissStaleReviews:
            input.response.required_pull_request_reviews.dismiss_stale_reviews,
          requireCodeOwnerReviews:
            input.response.required_pull_request_reviews
              .require_code_owner_reviews,
          requiredApprovingReviewCount:
            input.response.required_pull_request_reviews
              .required_approving_review_count,
          dismissalRestrictions: input.response.required_pull_request_reviews
            .dismissal_restrictions
            ? {
                users:
                  input.response.required_pull_request_reviews.dismissal_restrictions.users?.map(
                    (u) => u.login,
                  ) ?? [],
                teams:
                  input.response.required_pull_request_reviews.dismissal_restrictions.teams?.map(
                    (t) => t.slug,
                  ) ?? [],
                apps:
                  input.response.required_pull_request_reviews.dismissal_restrictions.apps
                    ?.map((a) => a?.slug)
                    .filter((s): s is string => !!s) ?? [],
              }
            : undefined,
        }
      : null,
    restrictions: input.response.restrictions
      ? {
          users:
            input.response.restrictions.users
              ?.map((u) => u.login)
              .filter((l): l is string => !!l) ?? [],
          teams:
            input.response.restrictions.teams
              ?.map((t) => t.slug)
              .filter((s): s is string => !!s) ?? [],
          apps:
            input.response.restrictions.apps
              ?.map((a) => a?.slug)
              .filter((s): s is string => !!s) ?? [],
        }
      : null,
    requiredSignatures: input.response.required_signatures?.enabled,
    requiredConversationResolution:
      input.response.required_conversation_resolution?.enabled,
  }) as HasMetadata<DeclaredGithubBranchProtection>;
};
