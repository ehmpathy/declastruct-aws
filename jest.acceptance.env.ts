import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import util from 'util';

import { keyrack } from 'rhachet/keyrack';

// eslint-disable-next-line no-undef
jest.setTimeout(90000); // downstream api calls

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * .what = verify that we're run from a valid project directory; otherwise, fail fast
 * .why = prevent confusion and hard-to-debug errors from run tests in the wrong directory
 */
if (!existsSync(join(process.cwd(), 'package.json')))
  throw new Error('no package.json found in cwd. are you @gitroot?');

/**
 * .what = source credentials from keyrack for test env
 * .why =
 *   - auto-inject keys into process.env
 *   - fail fast with helpful error if keyrack locked or keys absent
 * .note
 *   - use soft mode if aws credentials already present (e.g., ci oidc)
 *   - keyrack lists AWS_PROFILE but ci uses oidc which sets ACCESS_KEY_ID
 */
const keyrackYmlPath = join(process.cwd(), '.agent/keyrack.yml');
const hasAwsCredentials = !!(
  process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE
);
if (existsSync(keyrackYmlPath))
  keyrack.source({
    env: 'test',
    owner: 'ehmpath',
    mode: hasAwsCredentials ? 'lenient' : 'strict',
  });

/**
 * .what = verify that the env has sufficient auth to run the tests if aws is used; otherwise, fail fast
 * .why =
 *   - prevent time wasted on tests that fail due to absent credentials
 *   - prevent time wasted to debug tests which fail due to hard-to-read credential errors
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
