import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepoConfig } from '../../domain.objects/DeclaredGithubRepoConfig';
import { getRepoConfig } from '../../domain.operations/repoConfig/getRepoConfig';
import { setRepoConfig } from '../../domain.operations/repoConfig/setRepoConfig';

/**
 * .what = declastruct DAO for github repository configuration resources
 * .why = wraps existing repo config operations to conform to declastruct interface
 */
export const DeclaredGithubRepoConfigDao = new DeclastructDao<
  DeclaredGithubRepoConfig,
  typeof DeclaredGithubRepoConfig,
  ContextGithubApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getRepoConfig({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      if (isRefByUnique({ of: DeclaredGithubRepoConfig })(input))
        return getRepoConfig({ by: { unique: input } }, context);
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setRepoConfig({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setRepoConfig({ upsert: input }, context);
    },
  },
});
