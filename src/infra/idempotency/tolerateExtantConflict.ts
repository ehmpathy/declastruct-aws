/**
 * .what = runs an aws mutation, treats a specific "already extant" conflict as idempotent success
 * .why = some aws child-resource creates are not idempotent — they throw when the child already
 *   exists. our set operations must be safe to re-run, so when the mutation conflicts because the
 *   child we intended to create is already present, we treat it as success. all other errors
 *   rethrow, so failfast is preserved for genuine faults.
 * .safe = ONLY use this when the conflict's uniqueness key covers the FULL desired identity, so
 *   "already extant" proves equivalence to desired. this holds for AuthorizeSecurityGroup*
 *   (`InvalidPermission.Duplicate` keys on the entire rule tuple — protocol, ports, cidr/source —
 *   so a duplicate IS the exact rule we wanted).
 * .unsafe = do NOT use this when the conflict keys on only PART of the identity, or the extant
 *   child could differ from desired and we would report a false success. those sites must converge
 *   or verify instead of tolerate. examples:
 *     - CreateRoute conflicts on destination cidr but not target → ReplaceRoute to converge target
 *     - AttachInternetGateway conflicts on the gateway but not the vpc → verify vpc / fail loud
 *     - AssociateRouteTable conflicts on the subnet but not the table → full reconcile
 * .note = scoped by an explicit allowlist of aws error names, so we only ever swallow the exact
 *   "already extant" conflicts we expect — never a broad catch-all
 */
export const tolerateExtantConflict = async (
  input: { tolerate: string[] },
  fn: () => Promise<unknown>,
): Promise<void> => {
  // attempt the mutation; a clean run is idempotent success
  try {
    await fn();
    return;
  } catch (error) {
    // rethrow all that is not one of our expected "already extant" conflicts
    if (!(error instanceof Error) || !input.tolerate.includes(error.name))
      throw error;

    // tolerated: the child we intended to create already exists → idempotent success
  }
};
