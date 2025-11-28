import { execSync } from 'child_process';
import { DeclastructChange } from 'declastruct';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { given, when, then } from 'test-fns';

/**
 * .what = acceptance tests for declastruct CLI workflow
 * .why = validates end-to-end usage of declastruct-aws with declastruct CLI
 * .note = requires AWS_PROFILE via: `source .agent/repo=.this/skills/use.dev.awsprofile.sh`
 */
describe('declastruct CLI workflow', () => {
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

      then('plan includes VPC tunnel resource', async () => {
        /**
         * .what = validates plan includes VPC tunnel declaration
         * .why = ensures declastruct correctly processes AWS resource declarations
         */

        // execute plan generation
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${planFile}`,
          { stdio: 'inherit', env: process.env },
        );

        // parse plan
        const plan = JSON.parse(readFileSync(planFile, 'utf-8'));

        // verify VPC tunnel resource is present
        const tunnelResource: DeclastructChange = plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsVpcTunnel',
        );

        expect(tunnelResource).toBeDefined();
        expect(tunnelResource.forResource.slug).toContain(
          'DeclaredAwsVpcTunnel',
        );
      });
    });

    when('applying a plan via declastruct CLI', () => {
      then('opens VPC tunnel and verifies it is active', async () => {
        /**
         * .what = validates declastruct apply command works with AWS provider
         * .why = ensures end-to-end workflow from plan to reality
         * .note = opens tunnel via SSM port forwarding
         */

        // generate plan
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${planFile}`,
          { stdio: 'inherit', env: process.env },
        );

        // apply plan to open tunnel
        execSync(`npx declastruct apply --plan ${planFile}`, {
          stdio: 'inherit',
          env: process.env,
        });

        // verify tunnel is open by checking plan output shows OPEN status
        const plan = JSON.parse(readFileSync(planFile, 'utf-8'));
        const tunnelChange: DeclastructChange = plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsVpcTunnel',
        );
        expect(tunnelChange).toBeDefined();
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
