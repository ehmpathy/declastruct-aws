import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import util from 'util';

// eslint-disable-next-line no-undef
jest.setTimeout(90000); // we're calling downstream apis

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're running from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from running tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new Error('no package.json found in cwd. are you @gitroot?');

/**
 * sanity check that AWS credentials are available for integration tests
 *
 * usecases
 * - prevent silent test failures due to missing credentials
 * - provide clear instructions on how to set up credentials
 *
 * supports
 * - AWS_PROFILE: local dev via ~/.aws/config profiles
 * - AWS_ACCESS_KEY_ID: CI/CD via OIDC or IAM credentials
 */
if (!(process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID))
  throw new Error(
    'AWS credentials not set. Run w/ creds via `source .agent/repo=.this/skills/use.demo.awsprofile.sh && npm run test:integration`',
  );

/**
 * .what = verify that the env has sufficient auth to run the tests if aws is used; otherwise, fail fast
 * .why =
 *   - prevent time wasted waiting on tests to fail due to lack of credentials
 *   - prevent time wasted debugging tests which are failing due to hard-to-read missed credential errors
 */
const declapractUsePath = join(process.cwd(), 'declapract.use.yml');
const requiresAwsAuth =
  existsSync(declapractUsePath) &&
  readFileSync(declapractUsePath, 'utf8').includes('awsAccountId');
if (
  requiresAwsAuth &&
  !(process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID)
)
  throw new Error(
    'no aws credentials present. please authenticate with aws to run acceptance tests',
  );
