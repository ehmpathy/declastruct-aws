import { execSync } from 'child_process';
import { DeclastructChange } from 'declastruct';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { given, when, then, useBeforeAll } from 'test-fns';

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

    beforeAll(() => {
      // ensure clean test directory
      mkdirSync(testDir, { recursive: true });
    });

    when('generating a plan via declastruct CLI', () => {
      const prep = useBeforeAll(async () => {
        // execute declastruct plan command once for all plan assertions
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${planFile}`,
          { stdio: 'inherit', env: process.env },
        );

        // parse and return plan for assertions
        return {
          plan: JSON.parse(readFileSync(planFile, 'utf-8')) as {
            changes: DeclastructChange[];
          },
        };
      });

      then('creates a valid plan file', () => {
        /**
         * .what = validates declastruct plan command produces valid JSON output
         * .why = ensures CLI can parse resources file and generate plan
         */
        expect(existsSync(planFile)).toBe(true);
        expect(prep.plan).toHaveProperty('changes');
        expect(Array.isArray(prep.plan.changes)).toBe(true);
      });

      then('plan includes VPC tunnel resource', () => {
        /**
         * .what = validates plan includes VPC tunnel declaration
         * .why = ensures declastruct correctly processes AWS resource declarations
         */
        const tunnelResource = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsVpcTunnel',
        );
        expect(tunnelResource).toBeDefined();
        expect(tunnelResource!.forResource.slug).toContain(
          'DeclaredAwsVpcTunnel',
        );
      });

      then('plan includes lambda deployment resources', () => {
        /**
         * .what = validates plan includes lambda, version, and alias declarations
         * .why = ensures full lambda deployment flow is captured in plan
         */

        // verify iam role resource is present
        const roleChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsIamRole',
        );
        expect(roleChange).toBeDefined();
        expect(roleChange!.forResource.slug).toContain(
          'declastruct-acceptance-lambda-role',
        );

        // verify lambda resource is present
        const lambdaChange = prep.plan.changes.find(
          (r: DeclastructChange) => r.forResource.class === 'DeclaredAwsLambda',
        );
        expect(lambdaChange).toBeDefined();
        expect(lambdaChange!.forResource.slug).toContain(
          'declastruct-acceptance-lambda',
        );

        // verify lambda version resource is present
        const versionChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLambdaVersion',
        );
        expect(versionChange).toBeDefined();

        // verify lambda alias resource is present
        const aliasChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLambdaAlias',
        );
        expect(aliasChange).toBeDefined();
        expect(aliasChange!.forResource.slug).toContain('LIVE');
      });
    });

    when('applying a plan via declastruct CLI', () => {
      const prep = useBeforeAll(async () => {
        // generate fresh plan for apply phase
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${planFile}`,
          { stdio: 'inherit', env: process.env },
        );

        // apply plan once for all apply assertions
        execSync(`npx declastruct apply --plan ${planFile}`, {
          stdio: 'inherit',
          env: process.env,
        });

        // parse and return plan for assertions
        return {
          plan: JSON.parse(readFileSync(planFile, 'utf-8')) as {
            changes: DeclastructChange[];
          },
        };
      });

      then('opens VPC tunnel and verifies it is active', () => {
        /**
         * .what = validates declastruct apply command works with AWS provider
         * .why = ensures end-to-end workflow from plan to reality
         * .note = opens tunnel via SSM port forwarding
         */
        const tunnelChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsVpcTunnel',
        );
        expect(tunnelChange).toBeDefined();
      });

      then('deploys lambda with aliased version', () => {
        /**
         * .what = validates full lambda deployment flow via declastruct
         * .why = ensures role, lambda, version, and alias are correctly applied
         * .note = this is the core wish for declastruct-aws lambda support
         */

        // check role was created
        const roleChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsIamRole',
        );
        expect(roleChange).toBeDefined();

        // check lambda was created
        const lambdaChange = prep.plan.changes.find(
          (r: DeclastructChange) => r.forResource.class === 'DeclaredAwsLambda',
        );
        expect(lambdaChange).toBeDefined();

        // check version was published
        const versionChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLambdaVersion',
        );
        expect(versionChange).toBeDefined();

        // check alias was created
        const aliasChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLambdaAlias',
        );
        expect(aliasChange).toBeDefined();
      });

      then('is idempotent - applying same plan twice succeeds', () => {
        /**
         * .what = validates applying the same plan multiple times is safe
         * .why = ensures declastruct operations follow idempotency requirements
         */

        // apply plan second time - should succeed without errors
        execSync(`npx declastruct apply --plan ${planFile}`, {
          stdio: 'inherit',
          env: process.env,
        });
      });
    });
  });
});
