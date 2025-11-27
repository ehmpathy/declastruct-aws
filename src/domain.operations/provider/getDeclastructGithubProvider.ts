import { DeclastructProvider } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import { DeclaredGithubBranchDao } from '../../access/daos/DeclaredGithubBranchDao';
import { DeclaredGithubBranchProtectionDao } from '../../access/daos/DeclaredGithubBranchProtectionDao';
import { DeclaredGithubRepoConfigDao } from '../../access/daos/DeclaredGithubRepoConfigDao';
import { DeclaredGithubRepoDao } from '../../access/daos/DeclaredGithubRepoDao';
import { ContextGithubApi } from '../../domain.objects/ContextGithubApi';
import { DeclastructGithubProvider } from '../../domain.objects/DeclastructGithubProvider';

/**
 * .what = creates a declastruct provider for github resources
 * .why = enables github resource management via declastruct framework
 */
export const getDeclastructGithubProvider = (
  input: {
    credentials: {
      token: string;
    };
  },
  context: ContextLogTrail,
): DeclastructGithubProvider => {
  // build context from credentials and log trail
  const providerContext: ContextGithubApi & ContextLogTrail = {
    ...context,
    github: {
      token: input.credentials.token,
    },
  };

  // assemble DAOs for all github resource types
  const daos = {
    DeclaredGithubRepo: DeclaredGithubRepoDao,
    DeclaredGithubBranch: DeclaredGithubBranchDao,
    DeclaredGithubRepoConfig: DeclaredGithubRepoConfigDao,
    DeclaredGithubBranchProtection: DeclaredGithubBranchProtectionDao,
  };

  // return provider with all required properties
  return new DeclastructProvider({
    name: 'github',
    daos,
    context: providerContext,
    hooks: {
      beforeAll: async () => {
        // no setup needed for github provider
      },
      afterAll: async () => {
        // no teardown needed for github provider
      },
    },
  });
};
