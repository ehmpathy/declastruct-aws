import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranchProtection } from '../../domain.objects/DeclaredGithubBranchProtection';
import { getBranchProtection } from '../../domain.operations/branchProtection/getBranchProtection';
import { setBranchProtection } from '../../domain.operations/branchProtection/setBranchProtection';

/**
 * .what = declastruct DAO for github branch protection resources
 * .why = wraps existing branch protection operations to conform to declastruct interface
 */
export const DeclaredGithubBranchProtectionDao = new DeclastructDao<
  DeclaredGithubBranchProtection,
  typeof DeclaredGithubBranchProtection,
  ContextGithubApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getBranchProtection({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      if (isRefByUnique({ of: DeclaredGithubBranchProtection })(input))
        return getBranchProtection({ by: { unique: input } }, context);
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setBranchProtection({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setBranchProtection({ upsert: input }, context);
    },
  },
});
