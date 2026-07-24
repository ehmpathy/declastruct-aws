import { DomainEntity } from 'domain-objects';

/**
 * .what = a declared precondition for a console-only AWS Cost Explorer preference —
 *         a one-time opt-in the payer account must switch on before certain cost
 *         reads work (today: the EC2 rightsize recommendation opt-in)
 * .why = some cost-explorer reads (GetRightsizingRecommendation) throw AccessDenied
 *        until the feature is opted-in on the payer account's Cost Explorer
 *        Preferences page. AWS exposes NO api to enable it — it is console-only. so
 *        this resource is a declarative PRECONDITION: its get PROBES enablement (a
 *        read succeeds = enabled; an opt-in AccessDenied = off) and its set fails
 *        LOUD with console guidance (there is no write api). declare it FIRST in a
 *        wish so `plan` guides the human to switch it on before the billed report
 *        reads that depend on it ever run
 *
 * .identity
 *   - @unique = [feature] — one preference per named feature
 *   - no @primary — a derived/probed precondition, not an addressable resource
 *
 * .model = absent-when-off. get returns the object when the feature is enabled (→
 *   plan KEEP) and null when it is off (→ plan CREATE → set.findsert fires the
 *   console guidance). presence IS the enabled signal, so there is no `enabled`
 *   field to drift — the same absent-vs-present model every declared resource uses
 *
 * .note = read-mostly: get probes, set.findsert guides (console-only), upsert/delete
 *   are null. it maps to a REAL aws state (the CE preference enablement) probed via a
 *   real api, so it earns its DeclaredAws* per rule.forbid.dao-for-narrow-usecase-resource
 */
export interface DeclaredAwsCostExplorerPreference {
  /**
   * .what = the named Cost Explorer preference this precondition guards
   * .example = 'rightsizeRecommendations' (the EC2 rightsize opt-in)
   * .note = part of @unique
   */
  feature: string;
}

export class DeclaredAwsCostExplorerPreference
  extends DomainEntity<DeclaredAwsCostExplorerPreference>
  implements DeclaredAwsCostExplorerPreference
{
  // no primary — a probed precondition, not an addressable resource

  /**
   * .what = unique by the named feature
   */
  public static unique = ['feature'] as const;

  /**
   * .what = no metadata
   */
  public static metadata = [] as const;
}
