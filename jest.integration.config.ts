import type { Config } from 'jest';

// ensure tests run in utc, like they will on cicd and on server; https://stackoverflow.com/a/56277249/15593329
process.env.TZ = 'UTC';

// ensure tests run like on local machines, so snapshots are equal on local && cicd
process.env.FORCE_COLOR = 'true';

// https://jestjs.io/docs/configuration
const config: Config = {
  verbose: true,
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest', // use swc for faster compilation and better ESM support
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@octokit|@aws-sdk|@smithy|universal-user-agent|before-after-hook)/)',
  ],
  testMatch: ['**/*.integration.test.ts'],
  setupFiles: ['core-js'],
  setupFilesAfterEnv: ['./jest.integration.env.ts'],
  // use 50% of threads on local to leave headroom for other processes
  maxWorkers: '50%', // https://stackoverflow.com/questions/71287710/why-does-jest-run-faster-with-maxworkers-50
};

// eslint-disable-next-line import/no-default-export
export default config;
