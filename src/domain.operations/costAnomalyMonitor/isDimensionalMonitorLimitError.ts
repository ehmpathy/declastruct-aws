/**
 * .what = detects the AWS error that signals the per-account DIMENSIONAL monitor limit
 *         is already reached (a create cannot add a second AWS-services monitor)
 * .why = AWS Cost Anomaly Detection allows exactly one DIMENSIONAL (AWS-services)
 *        monitor per account — a singleton. a create that hits this limit is not a
 *        hard failure; the extant singleton IS our monitor (possibly under a stale
 *        name), so setCostAnomalyMonitor adopts it instead. this detector gates that
 *        adopt path
 * .note = matched on the live error MESSAGE, not an assumed name — the live signal is
 *        `ValidationException: Limit exceeded on dimensional spend monitor creation`.
 *        see feedback: verify the real aws off-signal before a detector
 */
export const isDimensionalMonitorLimitError = (input: {
  error: unknown;
}): boolean => {
  if (!(input.error instanceof Error)) return false;
  const { message } = input.error;
  const isLimitExceeded = /limit exceeded/i.test(message);
  const namesDimensionalMonitor = /dimensional spend monitor/i.test(message);
  return isLimitExceeded && namesDimensionalMonitor;
};
