import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclaredGithubBranch } from '../../domain.objects/DeclaredGithubBranch';
import { getBranch } from '../../domain.operations/branch/getBranch';
import { setBranch } from '../../domain.operations/branch/setBranch';

/**
 * .what = declastruct DAO for github branch resources
 * .why = wraps existing branch operations to conform to declastruct interface
 * .note = upsert allows updating the branch's commit SHA
 */
export const DeclaredGithubBranchDao = new DeclastructDao<
  DeclaredGithubBranch,
  typeof DeclaredGithubBranch,
  ContextGithubApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getBranch({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      if (isRefByUnique({ of: DeclaredGithubBranch })(input))
        return getBranch({ by: { unique: input } }, context);
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setBranch({ finsert: input }, context);
    },
    upsert: async (input, context) => {
      return setBranch({ upsert: input }, context);
    },
  },
});
