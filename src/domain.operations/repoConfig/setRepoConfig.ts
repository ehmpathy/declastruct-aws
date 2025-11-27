import { asProcedure } from 'as-procedure';
import { HelpfulError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepoConfig } from '../../domain.objects/DeclaredGithubRepoConfig';
import { castToDeclaredGithubRepoConfig } from './castToDeclaredGithubRepoConfig';
import { getRepoConfig } from './getRepoConfig';

/**
 * .what = sets a GitHub repository's configuration: upsert or finsert
 * .why = enables declarative updates of repo config following declastruct patterns
 */
export const setRepoConfig = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredGithubRepoConfig;
      upsert: DeclaredGithubRepoConfig;
    }>,
    context: ContextGithubApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredGithubRepoConfig>> => {
    const desired = input.finsert ?? input.upsert;

    // get cached GitHub client
    const github = getGithubClient({}, context);

    // check whether it already exists
    const before = await getRepoConfig(
      {
        by: {
          unique: {
            repo: desired.repo,
          },
        },
      },
      context,
    );

    // if it's a finsert and had a before, then return that
    if (before && input.finsert) return before;

    // update the repo config (always use update since config is part of repo, not a separate resource)
    try {
      const repoRef = desired.repo as { owner: string; name: string };
      const updated = await github.repos.update({
        owner: repoRef.owner,
        repo: repoRef.name,
        has_issues: desired.hasIssues,
        has_projects: desired.hasProjects,
        has_wiki: desired.hasWiki,
        has_downloads: desired.hasDownloads,
        is_template: desired.isTemplate,
        default_branch: desired.defaultBranch,
        allow_squash_merge: desired.allowSquashMerge,
        allow_merge_commit: desired.allowMergeCommit,
        allow_rebase_merge: desired.allowRebaseMerge,
        allow_auto_merge: desired.allowAutoMerge,
        delete_branch_on_merge: desired.deleteBranchOnMerge,
        allow_update_branch: desired.allowUpdateBranch,
        squash_merge_commit_title: desired.squashMergeCommitTitle,
        squash_merge_commit_message: desired.squashMergeCommitMessage,
        merge_commit_title: desired.mergeCommitTitle,
        merge_commit_message: desired.mergeCommitMessage,
        web_commit_signoff_required: desired.webCommitSignoffRequired,
      });

      return castToDeclaredGithubRepoConfig({
        response: updated.data,
        repo: desired.repo,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new HelpfulError('github.setRepoConfig.update error', {
        cause: error,
      });
    }
  },
);
