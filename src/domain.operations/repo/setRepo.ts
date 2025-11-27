import { asProcedure } from 'as-procedure';
import { HelpfulError } from 'helpful-errors';
import { HasMetadata, PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { getGithubClient } from '../../access/sdks/getGithubClient';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import { castToDeclaredGithubRepo } from './castToDeclaredGithubRepo';
import { getRepo } from './getRepo';

/**
 * .what = sets a GitHub repository: upsert or finsert
 * .why = enables declarative creation and updates of repos following declastruct patterns
 */
export const setRepo = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredGithubRepo;
      upsert: DeclaredGithubRepo;
    }>,
    context: ContextGithubApi & VisualogicContext,
  ): Promise<HasMetadata<DeclaredGithubRepo>> => {
    const desired = input.finsert ?? input.upsert;

    // apply defaults for optional fields
    const desiredHomepage = desired.homepage ?? null;
    const desiredPrivate = desired.private ?? desired.visibility !== 'public';
    const desiredArchived = desired.archived ?? false;

    // get cached GitHub client
    const github = getGithubClient({}, context);

    // check whether it already exists
    const before = await getRepo(
      {
        by: {
          unique: {
            owner: desired.owner,
            name: desired.name,
          },
        },
      },
      context,
    );

    // if it's a finsert and had a before, then return that
    if (before && input.finsert) return before;

    // if its an upsert and had a before, then this requires an update operation
    if (before && input.upsert) {
      try {
        const updated = await github.repos.update({
          owner: desired.owner,
          repo: desired.name,
          description: desired.description ?? undefined,
          homepage: desiredHomepage ?? undefined,
          private: desiredPrivate,
          visibility:
            desired.visibility === 'internal' ? undefined : desired.visibility,
          archived: desiredArchived,
        });

        return castToDeclaredGithubRepo(updated.data);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        throw new HelpfulError('github.setRepo.update error', {
          cause: error,
        });
      }
    }

    // otherwise, create it
    try {
      // use createInOrg which works for both orgs and personal accounts
      const created = await github.repos.createInOrg({
        org: desired.owner,
        name: desired.name,
        description: desired.description ?? undefined,
        homepage: desiredHomepage ?? undefined,
        private: desiredPrivate,
        visibility:
          desired.visibility === 'internal' ? undefined : desired.visibility,
      });

      return castToDeclaredGithubRepo(created.data);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new HelpfulError('github.setRepo.create error', { cause: error });
    }
  },
);
