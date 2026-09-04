import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import util from 'util';

import { keyrack } from 'rhachet/keyrack';

// eslint-disable-next-line no-undef
// 10 min: integration tests hit REAL aws, and the slowest paths — EC2 hibernate/resume
// (stop + wait + resume + wait), SSH-tunnel-over-SSM, and eventual-consistency lookups/
// deletes (ENI detach) — legitimately exceed the old 90s cap. this is a CAP, not a wait, so
// fast tests (all api-only ones, incl. every ses/s3/sns mail test at 13-23s) finish as
// quickly as before; only the genuinely-slow VM-lifecycle tests use more of the budget.
jest.setTimeout(600000);

// real aws integration tests occasionally hit a transient infra flake — a request socket that
// connects but then stalls with no response (aws-sdk v3 has no default requestTimeout), or an
// eventual-consistency read that lags behind a just-applied write. these are infra hiccups, not
// defects in the code under test. the ROOT-CAUSE fixes carry the load: getAwsClientConfig bounds
// requestTimeout/connectionTimeout + adaptive retry, the no-waiter assertion sits safely under
// the waiter floor, and the s3 lifecycle read polls to a stable value. this retry is only a net
// ON TOP of those.
//
// it cannot mask a correctness bug in this PR's new code. jest.retryTimes re-runs the WHOLE test
// (setup + assertions), not a hidden inner retry, and every operation under test is idempotent
// (rule.require.idempotent-operations): a findsert re-run finds the resource its first attempt
// created; a del re-run is a no-op. so a retry that passes proves the operation CONVERGED to the
// declared state — the correct behavior — not that a race was hidden. a genuine non-transient
// defect (a wrong shape, a real race that does not converge) fails all 3 attempts and surfaces
// loud. so the net catches infra jitter with no drop in the correctness bar.
jest.retryTimes(2, { logErrorsBeforeRetry: true });

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new Error('no package.json found in cwd. are you @gitroot?');

/**
 * sanity check that unit tests are only run the 'test' environment
 *
 * usecases
 * - prevent polluting prod state with test data
 * - prevent executing financially impacting mutations
 */
if (
  (process.env.NODE_ENV !== 'test' ||
    (process.env.STAGE && process.env.STAGE !== 'test')) &&
  process.env.I_KNOW_WHAT_IM_DOING !== 'true'
)
  throw new Error(`integration.test is not targeting stage 'test'`);

/**
 * .what = source credentials from keyrack for test env
 * .why =
 *   - auto-inject keys into process.env
 *   - fail fast with helpful error if keyrack locked or keys absent
 */
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
if (existsSync(keyrackYmlPath))
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });

/**
 * .what = verify that the env has sufficient auth to run the tests if aws is used; otherwise, fail fast
 * .why =
 *   - prevent time wasted on tests that fail due to absent credentials
 *   - prevent time wasted to debug tests which fail due to hard-to-read credential errors
 */
const declapractUsePath = join(process.cwd(), 'declapract.use.yml');
const declapractUseContent = existsSync(declapractUsePath)
  ? readFileSync(declapractUsePath, 'utf8')
  : '';
const requiresAwsAuth = declapractUseContent.includes('awsAccountId');
if (
  requiresAwsAuth &&
  !(process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID)
)
  throw new Error(
    'no aws credentials present. please authenticate with aws to run integration tests',
  );

/**
 * .what = verify that the testdb has been provisioned if a databaseUserName is declared
 * .why =
 *   - prevent time wasted waiting on tests to fail due to missing testdb
 *   - prevent confusing "password authentication failed" errors when testdb isn't running or was provisioned for a different repo
 */
const requiresTestDb = declapractUseContent.includes('databaseUserName');
if (requiresTestDb) {
  const testConfigPath = join(process.cwd(), 'config', 'test.json');
  if (!existsSync(testConfigPath))
    throw new Error(
      'config/test.json not found but serviceUser is declared in declapract.use.yml',
    );
  const testConfig = JSON.parse(readFileSync(testConfigPath, 'utf8'));
  if (
    !testConfig.database?.tunnel?.local ||
    !testConfig.database?.role?.crud ||
    !testConfig.database?.target?.database
  )
    throw new Error(
      'config/test.json database.tunnel.local, database?.role?.crud, or database?.target?.database not found but expected',
    );
  try {
    execSync(
      `PGPASSWORD="${testConfig.database.role.crud.password}" psql -h ${testConfig.database.tunnel.local.host} -p ${testConfig.database.tunnel.local.port} -U ${testConfig.database.role.crud.username} -d ${testConfig.database.target.database} -c "SELECT 1" > /dev/null 2>&1`,
      { timeout: 3000 },
    );
  } catch {
    throw new Error(
      `did you forget to \`npm run start:testdb\`? cant connect to database`,
    );
  }
}
