import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import { getRepo } from '../../domain.operations/repo/getRepo';
import { setRepo } from '../../domain.operations/repo/setRepo';

/**
 * .what = declastruct DAO for github repository resources
 * .why = wraps existing repo operations to conform to declastruct interface
 */
export const DeclaredGithubRepoDao = new DeclastructDao<
  DeclaredGithubRepo,
  typeof DeclaredGithubRepo,
  ContextGithubApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getRepo({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      if (isRefByUnique({ of: DeclaredGithubRepo })(input))
        return getRepo({ by: { unique: input } }, context);
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setRepo({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setRepo({ upsert: input }, context);
    },
  },
});
