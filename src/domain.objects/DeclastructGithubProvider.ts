import { DeclastructDao, DeclastructProvider } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import { ContextGithubApi } from './ContextGithubApi';
import { DeclaredGithubBranch } from './DeclaredGithubBranch';
import { DeclaredGithubBranchProtection } from './DeclaredGithubBranchProtection';
import { DeclaredGithubRepo } from './DeclaredGithubRepo';
import { DeclaredGithubRepoConfig } from './DeclaredGithubRepoConfig';

/**
 * .what = the declastruct provider for github resources
 * .why = provides type safety and reusability for the github provider
 */
export type DeclastructGithubProvider = DeclastructProvider<
  {
    DeclaredGithubRepo: DeclastructDao<
      DeclaredGithubRepo,
      typeof DeclaredGithubRepo,
      ContextGithubApi & ContextLogTrail
    >;
    DeclaredGithubBranch: DeclastructDao<
      DeclaredGithubBranch,
      typeof DeclaredGithubBranch,
      ContextGithubApi & ContextLogTrail
    >;
    DeclaredGithubRepoConfig: DeclastructDao<
      DeclaredGithubRepoConfig,
      typeof DeclaredGithubRepoConfig,
      ContextGithubApi & ContextLogTrail
    >;
    DeclaredGithubBranchProtection: DeclastructDao<
      DeclaredGithubBranchProtection,
      typeof DeclaredGithubBranchProtection,
      ContextGithubApi & ContextLogTrail
    >;
  },
  ContextGithubApi & ContextLogTrail
>;
