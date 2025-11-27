import { execSync } from 'child_process';
import util from 'util';

// eslint-disable-next-line no-undef
jest.setTimeout(90000); // we're calling downstream apis

/**
 * sanity check that GITHUB_TOKEN is available for acceptance tests
 *
 * usecases
 * - prevent silent test failures due to missing credentials
 * - provide clear instructions on how to set up token
 */
if (!process.env.GITHUB_TOKEN)
  throw new Error(
    'GITHUB_TOKEN not set. Run: source .agent/repo=.this/skills/use.demorepo.token.sh',
  );

/**
 * sanity check that declastruct CLI is available for acceptance tests
 *
 * usecases
 * - prevent silent test failures due to missing CLI
 * - provide clear instructions on missing dependency
 */
try {
  execSync('npx declastruct --version', { stdio: 'pipe' });
} catch (error) {
  throw new Error(
    'declastruct CLI not available - required for acceptance tests',
  );
}
