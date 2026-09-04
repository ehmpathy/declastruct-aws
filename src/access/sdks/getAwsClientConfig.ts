/**
 * .what = the shared config every aws-sdk client in this repo is built with
 * .why = real aws requests occasionally STALL — a socket that connects but never receives a
 *   response. the aws-sdk default has NO request timeout, so a stalled call hangs forever (in a
 *   plan/apply it blocks the whole run; in tests it burns to the jest cap). worse, adaptive
 *   retry cannot rescue a silent stall — retries fire on ERRORS, and a hung socket raises none.
 *   so bound each request: a `requestTimeout` aborts a stalled socket, and adaptive retry then
 *   recovers it (and holds back under throttle). every client shares ONE bounded config.
 * .note
 *   - requestTimeout 120s: generous for the slowest legit call (ec2 waiters poll separately, so
 *     no single request runs this long) yet far under any caller timeout, so a stall fails fast
 *   - connectionTimeout 8s: a socket that cannot even connect should not sit for the full window
 *   - retryMode 'adaptive' + maxAttempts 8: recover an aborted/throttled request without a
 *     hand-rolled loop; the fast path is untouched (these engage only on error)
 */
export const getAwsClientConfig = (input: {
  region: string;
}): {
  region: string;
  retryMode: 'adaptive';
  maxAttempts: number;
  requestHandler: { requestTimeout: number; connectionTimeout: number };
} => ({
  region: input.region,
  retryMode: 'adaptive',
  maxAttempts: 8,
  requestHandler: { requestTimeout: 120000, connectionTimeout: 8000 },
});
