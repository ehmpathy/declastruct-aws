/**
 * .what = the named Cost Explorer preferences this precondition resource can guard
 * .why = each maps to a console-only opt-in on the payer account. the shape is an object
 *        so a new preference (e.g. a Cost Optimization Hub toggle) is a one-line addition,
 *        not a new resource type
 * .note = the string VALUE is the resource's @unique `feature` identity, so it is a
 *         stable contract — do not rename a value without a migration
 */
export const COST_EXPLORER_PREFERENCE_FEATURES = {
  /**
   * .what = the EC2 rightsize recommendation opt-in (free)
   * .why = GetRightsizingRecommendation throws AccessDenied until it is on
   */
  rightsizeRecommendations: 'rightsizeRecommendations',

  /**
   * .what = the resource-level data at DAILY granularity opt-in (a FREE console preference)
   * .why = GetCostAndUsageWithResources throws AccessDenied until it is on. the DAILY
   *        resource-level tier is FREE — it just needs the switch flipped + at least one
   *        service chosen; it retains per-resource cost detail for the last ~14 days. only
   *        the separate HOURLY granularity tier is paid ($0.01 per 1,000 usage-records/mo),
   *        which this report does not require (it reads at daily granularity)
   */
  resourceLevelData: 'resourceLevelData',
} as const;

export type CostExplorerPreferenceFeature =
  (typeof COST_EXPLORER_PREFERENCE_FEATURES)[keyof typeof COST_EXPLORER_PREFERENCE_FEATURES];
