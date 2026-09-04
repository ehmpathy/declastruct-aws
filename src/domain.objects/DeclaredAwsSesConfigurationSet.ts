import { DomainEntity } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = an SES configuration set — a named group applied to sent mail
 * .why = groups sent mail so open + feedback events (bounce/complaint/delivery/reject/open/
 *   click) can be captured via one or more event destinations (`AWS::SES::ConfigurationSet`)
 *
 * .identity
 *   - @unique = [name] — the configuration-set name is the natural key
 *   - @primary = [name] — SES assigns no separate id; the name IS the key
 */
export interface DeclaredAwsSesConfigurationSet {
  /**
   * .what = the configuration-set name
   * .note = @unique + @primary
   */
  name: string;

  /**
   * .what = the tags applied to the configuration set
   * .note = null = no tags
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsSesConfigurationSet
  extends DomainEntity<DeclaredAwsSesConfigurationSet>
  implements DeclaredAwsSesConfigurationSet
{
  /**
   * .what = SES assigns no separate id; the name IS the key
   */
  public static primary = ['name'] as const;

  /**
   * .what = the configuration-set name is the natural unique key
   */
  public static unique = ['name'] as const;

  /**
   * .what = no aws-assigned identity attributes
   */
  public static metadata = [] as const;

  /**
   * .what = no intrinsic read-only attributes
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    tags: DeclaredAwsTags,
  };
}
