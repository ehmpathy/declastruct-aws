import { given, when, then } from 'test-fns';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { DeclaredGithubBranchProtection } from '../../domain.objects/DeclaredGithubBranchProtection';
import { DeclaredGithubRepoConfig } from '../../domain.objects/DeclaredGithubRepoConfig';
import { getDeclastructGithubProvider } from './getDeclastructGithubProvider';

const log = console;

/**
 * .what = integration tests for declastruct github provider
 * .why = validates provider interface works correctly with real github API
 */
describe('getDeclastructGithubProvider', () => {
  const githubContext = getSampleGithubContext();

  given('a declastruct github provider', () => {
    // create provider with credentials
    const provider = getDeclastructGithubProvider(
      {
        credentials: {
          token: githubContext.github.token,
        },
      },
      { log },
    );

    then('should have correct name', () => {
      expect(provider.name).toBe('github');
    });

    then('should have all required DAOs', () => {
      expect(provider.daos.DeclaredGithubRepo).toBeDefined();
      expect(provider.daos.DeclaredGithubBranch).toBeDefined();
      expect(provider.daos.DeclaredGithubRepoConfig).toBeDefined();
      expect(provider.daos.DeclaredGithubBranchProtection).toBeDefined();
    });

    then('should have lifecycle hooks', () => {
      expect(provider.hooks.beforeAll).toBeDefined();
      expect(provider.hooks.afterAll).toBeDefined();
    });

    then('should have github context with token', () => {
      expect(provider.context.github.token).toBe(githubContext.github.token);
    });

    when('using repo dao', () => {
      const repoDao = provider.daos.DeclaredGithubRepo;

      then('should have get.byUnique method', () => {
        expect(repoDao.get.byUnique).toBeDefined();
      });

      then('should have get.byRef method', () => {
        expect(repoDao.get.byRef).toBeDefined();
      });

      then('should have set.finsert method', () => {
        expect(repoDao.set.finsert).toBeDefined();
      });

      then('should have set.upsert method', () => {
        expect(repoDao.set.upsert).toBeDefined();
      });

      then('can get repo by unique', async () => {
        /**
         * .what = validates byUnique can fetch existing repo from github
         * .why = ensures read operations work correctly via provider interface
         */
        const repo = await repoDao.get.byUnique(
          {
            owner: 'ehmpathy',
            name: 'declastruct-aws-demo',
          },
          provider.context,
        );

        // verify repo was fetched
        expect(repo).toBeDefined();
        expect(repo?.name).toBe('declastruct-aws-demo');
        expect(repo?.owner).toBe('ehmpathy');
      });
    });

    when('using branch dao', () => {
      const branchDao = provider.daos.DeclaredGithubBranch;

      then('should have get.byUnique method', () => {
        expect(branchDao.get.byUnique).toBeDefined();
      });

      then('should have get.byRef method', () => {
        expect(branchDao.get.byRef).toBeDefined();
      });

      then('should have set.finsert method', () => {
        expect(branchDao.set.finsert).toBeDefined();
      });

      then('should have set.upsert method', () => {
        expect(branchDao.set.upsert).toBeDefined();
      });

      then('can get branch by unique', async () => {
        /**
         * .what = validates byUnique can fetch existing branch from github
         * .why = ensures read operations work correctly via provider interface
         */
        const branch = await branchDao.get.byUnique(
          {
            repo: { owner: 'ehmpathy', name: 'declastruct-aws-demo' },
            name: 'main',
          },
          provider.context,
        );

        // verify branch was fetched
        expect(branch).toBeDefined();
        expect(branch?.name).toBe('main');
      });
    });

    when('using repo config dao', () => {
      const repoConfigDao = provider.daos.DeclaredGithubRepoConfig;

      then('should have get.byUnique method', () => {
        expect(repoConfigDao.get.byUnique).toBeDefined();
      });

      then('should have get.byRef method', () => {
        expect(repoConfigDao.get.byRef).toBeDefined();
      });

      then('should have set.finsert method', () => {
        expect(repoConfigDao.set.finsert).toBeDefined();
      });

      then('should have set.upsert method', () => {
        expect(repoConfigDao.set.upsert).toBeDefined();
      });

      then('can get repo config by unique', async () => {
        /**
         * .what = validates byUnique can fetch existing repo config from github
         * .why = ensures read operations work correctly via provider interface
         */
        const config = await repoConfigDao.get.byUnique(
          {
            repo: { owner: 'ehmpathy', name: 'declastruct-aws-demo' },
          },
          provider.context,
        );

        // verify config was fetched
        expect(config).toBeDefined();
        expect(config?.repo.name).toBe('declastruct-aws-demo');
      });

      then('can upsert repo config idempotently', async () => {
        /**
         * .what = validates upsert creates or updates repo config on github
         * .why = ensures write operations work correctly via provider interface
         * .note = uses minimal safe configuration for demo repo
         */

        // define desired repo configuration
        const desiredConfig = DeclaredGithubRepoConfig.as({
          repo: { owner: 'ehmpathy', name: 'declastruct-aws-demo' },
          hasIssues: true,
          hasProjects: false,
          hasWiki: false,
          hasDownloads: true,
          isTemplate: false,
          defaultBranch: 'main',
          allowSquashMerge: true,
          allowMergeCommit: false,
          allowRebaseMerge: false,
          allowAutoMerge: false,
          deleteBranchOnMerge: true,
          allowUpdateBranch: true,
        });

        // upsert
        const result = await repoConfigDao.set.upsert!(
          desiredConfig,
          provider.context,
        );

        // verify upsert succeeded
        expect(result).toBeDefined();
        expect(result.repo.name).toBe('declastruct-aws-demo');
      });
    });

    when('using branch protection dao', () => {
      const branchProtectionDao = provider.daos.DeclaredGithubBranchProtection;

      then('should have get.byUnique method', () => {
        expect(branchProtectionDao.get.byUnique).toBeDefined();
      });

      then('should have get.byRef method', () => {
        expect(branchProtectionDao.get.byRef).toBeDefined();
      });

      then('should have set.finsert method', () => {
        expect(branchProtectionDao.set.finsert).toBeDefined();
      });

      then('should have set.upsert method', () => {
        expect(branchProtectionDao.set.upsert).toBeDefined();
      });

      then('can get branch protection by unique', async () => {
        /**
         * .what = validates byUnique can fetch existing branch protection from github
         * .why = ensures read operations work correctly via provider interface
         */
        const protection = await branchProtectionDao.get.byUnique(
          {
            branch: {
              repo: { owner: 'ehmpathy', name: 'declastruct-aws-demo' },
              name: 'main',
            },
          },
          provider.context,
        );

        // verify protection was fetched (may be null if not configured)
        expect(protection !== undefined).toBe(true);
      });

      then('can upsert branch protection idempotently', async () => {
        /**
         * .what = validates upsert creates or updates branch protection on github
         * .why = ensures write operations work correctly via provider interface
         * .note = uses idempotent operation safe for demo repo
         */

        // define desired protection configuration
        const desiredProtection = DeclaredGithubBranchProtection.as({
          branch: {
            repo: { owner: 'ehmpathy', name: 'declastruct-aws-demo' },
            name: 'main',
          },
          requiredStatusChecks: null,
          enforceAdmins: false,
          requiredPullRequestReviews: null,
          restrictions: null,
          requireLinearHistory: false,
          allowsForcePushes: false,
          allowsDeletions: false,
          blockCreations: false,
          requiredConversationResolution: false,
          lockBranch: false,
          allowForkSyncing: false,
        });

        // upsert
        const result = await branchProtectionDao.set.upsert!(
          desiredProtection,
          provider.context,
        );

        // verify upsert succeeded
        expect(result).toBeDefined();
        expect(result.branch.name).toBe('main');
        expect(result.branch.repo.name).toBe('declastruct-aws-demo');
      });
    });
  });
});
