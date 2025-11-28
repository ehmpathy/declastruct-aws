import { execSync } from 'child_process';
import util from 'util';

// eslint-disable-next-line no-undef
jest.setTimeout(90000); // we're calling downstream apis

/**
 * sanity check that AWS_PROFILE is available for integration tests
 *
 * usecases
 * - prevent silent test failures due to missing credentials
 * - provide clear instructions on how to set up token
 */
if (!process.env.AWS_PROFILE)
  throw new Error(
    'AWS_PROFILE not set. Run: source .agent/repo=.this/skills/use.dev.awsprofile.sh',
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
