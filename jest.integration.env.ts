import util from 'util';

// eslint-disable-next-line no-undef
jest.setTimeout(90000); // since we're calling downstream apis

// set console.log to not truncate nested objects
util.inspect.defaultOptions.depth = 5;

/**
 * sanity check that unit tests are only run the 'test' environment
 *
 * usecases
 * - prevent polluting prod state with test data
 * - prevent executing financially impacting mutations
 */
if (
  (process.env.NODE_ENV !== 'test' || process.env.STAGE) &&
  process.env.I_KNOW_WHAT_IM_DOING !== 'true'
)
  throw new Error(`integration.test is not targeting stage 'test'`);

/**
 * sanity check that GITHUB_TOKEN is available for integration tests
 *
 * usecases
 * - prevent silent test failures due to missing credentials
 * - provide clear instructions on how to set up token
 */
if (!process.env.GITHUB_TOKEN)
  throw new Error(
    'GITHUB_TOKEN not set. Run: source .agent/repo=.this/skills/use.demorepo.token.sh',
  );
