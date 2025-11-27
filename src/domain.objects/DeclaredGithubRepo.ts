import { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity } from 'domain-objects';

/**
 * .what = a declarative structure which represents a GitHub repository
 * .why = enables declarative management of GitHub repos following declastruct patterns
 */
export interface DeclaredGithubRepo {
  /**
   * .what = GitHub's internal repo ID
   * .note = is @metadata -> may be undefined
   */
  id?: number;

  /**
   * .what = when the repo was created
   * .note = is @metadata -> may be undefined
   */
  createdAt?: UniDateTime;

  /**
   * .what = when the repo was last updated
   * .note = is @metadata -> may be undefined
   */
  updatedAt?: UniDateTime;

  /**
   * .what = organization or user name
   */
  owner: string;

  /**
   * .what = repository name
   */
  name: string;

  /**
   * .what = repository description
   * .note = null if not set
   */
  description: string | null;

  /**
   * .what = homepage URL
   * .note = optional; defaults to null
   */
  homepage?: string | null;

  /**
   * .what = whether the repo is private
   * .note = optional; derived from visibility !== 'public' if not provided
   */
  private?: boolean;

  /**
   * .what = visibility setting
   * .note = public, private, or internal (for enterprise)
   */
  visibility: 'public' | 'private' | 'internal';

  /**
   * .what = whether the repo is archived
   * .note = optional; defaults to false
   */
  archived?: boolean;
}

export class DeclaredGithubRepo
  extends DomainEntity<DeclaredGithubRepo>
  implements DeclaredGithubRepo
{
  public static unique = ['owner', 'name'] as const;
}
