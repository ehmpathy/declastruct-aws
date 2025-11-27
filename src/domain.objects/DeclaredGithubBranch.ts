import { DomainEntity, RefByUnique } from 'domain-objects';

import { DeclaredGithubRepo } from './DeclaredGithubRepo';

/**
 * .what = a declarative structure which represents a GitHub branch
 * .why = enables declarative management of GitHub branches following declastruct patterns
 */
export interface DeclaredGithubBranch {
  /**
   * .what = the commit that this branch points to
   * .note = is @metadata -> may be undefined
   */
  commit?: { sha: string };

  /**
   * .what = whether branch protection is enabled
   * .note = is @metadata -> may be undefined
   */
  protected?: boolean;

  /**
   * .what = reference to the repository this branch belongs to
   */
  repo: RefByUnique<typeof DeclaredGithubRepo>;

  /**
   * .what = branch name
   * .note = e.g., 'main', 'develop', 'feature/add-auth'
   */
  name: string;
}

export class DeclaredGithubBranch
  extends DomainEntity<DeclaredGithubBranch>
  implements DeclaredGithubBranch
{
  public static unique = ['repo', 'name'] as const;
  public static nested = {
    repo: RefByUnique<typeof DeclaredGithubRepo>,
  };
}
