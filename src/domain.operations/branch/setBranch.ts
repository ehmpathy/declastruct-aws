import { asProcedure } from 'as-procedure';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranch } from '../../domain.objects/DeclaredGithubBranch';
import { getBranch } from './getBranch';
import { getBranchCommitShaByRepoDefault } from './getBranchCommitShaByRepoDefault';

/**
 * .what = sets a GitHub branch: upsert or finsert
 * .why = enables declarative creation and updates of branches following declastruct patterns
 */
export const setBranch = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredGithubBranch;
      upsert: DeclaredGithubBranch;
    }>,
    context: ContextGithubApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredGithubBranch>> => {
    const desired = input.finsert ?? input.upsert;

    // get cached GitHub client
    const github = getGithubClient({}, context);

    // check whether branch already exists
    const before = await getBranch(
      {
        by: {
          unique: {
            repo: desired.repo,
            name: desired.name,
          },
        },
      },
      context,
    );

    // if it's a finsert and had a before, then return that
    if (before && input.finsert) return before;

    // if its an upsert and had a before but no commit.sha change, return existing
    if (before && input.upsert && !desired.commit?.sha) return before;
    if (before && input.upsert && desired.commit?.sha === before.commit?.sha)
      return before;

    // if its an upsert with a commit.sha change, update the branch
    if (before && input.upsert && desired.commit?.sha) {
      try {
        await github.git.updateRef({
          owner: desired.repo.owner,
          repo: desired.repo.name,
          ref: `heads/${desired.name}`,
          sha: desired.commit.sha,
          force: false, // don't force update - fail if not fast-forward
        });

        // fetch the updated branch to return full metadata
        return (
          (await getBranch(
            {
              by: {
                unique: {
                  repo: desired.repo,
                  name: desired.name,
                },
              },
            },
            context,
          )) ??
          UnexpectedCodePathError.throw('updated branch not found', {
            name: desired.name,
          })
        );
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        throw new HelpfulError('github.setBranch.update error', {
          cause: error,
        });
      }
    }

    // otherwise, create it
    try {
      // determine commit SHA to create branch from
      const commitSha =
        desired.commit?.sha ??
        (await getBranchCommitShaByRepoDefault(
          {
            repo: desired.repo,
          },
          context,
        ));

      // create the branch using git refs API
      await github.git.createRef({
        owner: desired.repo.owner,
        repo: desired.repo.name,
        ref: `refs/heads/${desired.name}`,
        sha: commitSha,
      });

      // fetch the created branch to return full metadata
      return (
        (await getBranch(
          {
            by: {
              unique: {
                repo: desired.repo,
                name: desired.name,
              },
            },
          },
          context,
        )) ??
        UnexpectedCodePathError.throw('created branch not found', {
          name: desired.name,
        })
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new HelpfulError('github.setBranch.create error', {
        cause: error,
      });
    }
  },
);
