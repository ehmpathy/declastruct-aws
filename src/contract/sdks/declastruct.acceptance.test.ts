import { execSync } from 'child_process';
import { DeclastructChange } from 'declastruct';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { given, when, then } from 'test-fns';

import { getSampleGithubContext } from '../../.test/assets/getSampleGithubContext';
import { DeclaredGithubRepo } from '../../domain.objects/DeclaredGithubRepo';
import { getDeclastructGithubProvider } from '../../domain.operations/provider/getDeclastructGithubProvider';

const log = console;

/**
 * .what = acceptance tests for declastruct CLI workflow
 * .why = validates end-to-end usage of declastruct-aws with declastruct CLI
 */
describe('declastruct CLI workflow', () => {
  const githubContext = getSampleGithubContext();

  given('a declastruct resources file', () => {
    const testDir = join(
      __dirname,
      '.test',
      '.temp',
      'acceptance',
      `run.${new Date().toISOString()}`,
    );
    const resourcesFile = join(
      __dirname,
      '.test',
      'assets',
      'resources.acceptance.ts',
    );
    const planFile = join(testDir, 'plan.json');

    beforeEach(() => {
      // ensure clean test directory
      mkdirSync(testDir, { recursive: true });
    });

    when('generating a plan via declastruct CLI', () => {
      then('creates a valid plan file', async () => {
        /**
         * .what = validates declastruct plan command produces valid JSON output
         * .why = ensures CLI can parse resources file and generate plan
         */

        // execute declastruct plan command
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${planFile}`,
          { stdio: 'inherit', env: process.env },
        );

        // verify plan file exists
        const planExists = existsSync(planFile);
        expect(planExists).toBe(true);

        // verify plan contains expected structure
        const plan = JSON.parse(readFileSync(planFile, 'utf-8'));
        expect(plan).toHaveProperty('changes');
        expect(Array.isArray(plan.changes)).toBe(true);
      });

      then('plan includes repo and config resources', async () => {
        /**
         * .what = validates plan includes all declared resources
         * .why = ensures declastruct correctly processes resource declarations
         */

        // execute plan generation
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${planFile}`,
          { stdio: 'inherit', env: process.env },
        );

        // parse plan
        const plan = JSON.parse(readFileSync(planFile, 'utf-8'));

        // verify resources
        const repoResource: DeclastructChange = plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredGithubRepo',
        );
        const configResource: DeclastructChange = plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredGithubRepoConfig',
        );

        expect(repoResource).toBeDefined();
        expect(repoResource.forResource.slug).toContain('declastruct-aws-demo');
        expect(configResource).toBeDefined();
        expect(configResource.forResource.slug).toContain(
          'declastruct-aws-demo',
        );
      });
    });

    when('applying a plan via declastruct CLI', () => {
      then('executes changes and verifies resources exist', async () => {
        /**
         * .what = validates declastruct apply command works with github provider
         * .why = ensures end-to-end workflow from plan to reality
         * .note = uses existing declastruct-aws-demo repo for idempotent test
         */

        // generate plan
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${planFile}`,
          { stdio: 'inherit', env: process.env },
        );

        // apply plan
        execSync(`npx declastruct apply --plan ${planFile}`, {
          stdio: 'inherit',
          env: process.env,
        });

        // verify resources exist via github API
        const provider = getDeclastructGithubProvider(
          {
            credentials: { token: githubContext.github.token },
          },
          { log },
        );

        const repo = await provider.daos.DeclaredGithubRepo.get.byUnique(
          {
            owner: 'ehmpathy',
            name: 'declastruct-aws-demo',
          },
          provider.context,
        );

        expect(repo).toBeDefined();
        expect(repo!.name).toBe('declastruct-aws-demo');
      });

      then('is idempotent - applying same plan twice succeeds', async () => {
        /**
         * .what = validates applying the same plan multiple times is safe
         * .why = ensures declastruct operations follow idempotency requirements
         */

        // generate plan
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${planFile}`,
          { stdio: 'inherit', env: process.env },
        );

        // apply plan first time
        execSync(`npx declastruct apply --plan ${planFile}`, {
          stdio: 'inherit',
          env: process.env,
        });

        // apply plan second time - should succeed without errors
        execSync(`npx declastruct apply --plan ${planFile}`, {
          stdio: 'inherit',
          env: process.env,
        });
      });
    });
  });
});
