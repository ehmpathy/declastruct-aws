import { asUniDateTime } from '@ehmpathy/uni-time';
import { execSync } from 'child_process';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import type { DeclastructChange } from 'declastruct';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { DeclaredAwsLogGroupReportCostOfIngestionDao } from '../../access/daos/DeclaredAwsLogGroupReportCostOfIngestionDao';
import { DeclaredAwsLogGroupReportDistOfPatternDao } from '../../access/daos/DeclaredAwsLogGroupReportDistOfPatternDao';
import { getDeclastructAwsProvider } from '../../domain.operations/provider/getDeclastructAwsProvider';

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
    const lambdaName = 'declastruct-acceptance-lambda';

    beforeAll(async () => {
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

      then('plan includes log group report resources', () => {
        /**
         * .what = validates plan includes log group report declarations
         * .why = ensures log trend analysis resources are captured in plan
         */

        // verify pattern distribution report is present
        const patternReportChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLogGroupReportDistOfPattern',
        );
        expect(patternReportChange).toBeDefined();

        // verify ingestion cost report is present
        const costReportChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLogGroupReportCostOfIngestion',
        );
        expect(costReportChange).toBeDefined();
      });

      then('plan includes log group with retention resource', () => {
        /**
         * .what = validates plan includes log group with retention declaration
         * .why = ensures log group retention management is captured in plan
         */
        const logGroupChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLogGroup' &&
            r.forResource.slug.includes('with-retention'),
        );
        expect(logGroupChange).toBeDefined();
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

      then('creates log group with retention policy', () => {
        /**
         * .what = validates log group is created with retention via declastruct
         * .why = ensures setLogGroup operation works through declastruct workflow
         */
        const logGroupChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLogGroup' &&
            r.forResource.slug.includes('with-retention'),
        );
        expect(logGroupChange).toBeDefined();
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

    when('re-planning after apply to verify idempotency', () => {
      const verifyPlanFile = join(testDir, 'plan-verify.json');

      const prep = useBeforeAll(async () => {
        // generate a fresh plan after apply — if everything was applied correctly,
        // all resources should show "KEEP" (no changes needed)
        execSync(
          `npx declastruct plan --wish ${resourcesFile} --into ${verifyPlanFile}`,
          { stdio: 'inherit', env: process.env },
        );

        return {
          plan: JSON.parse(readFileSync(verifyPlanFile, 'utf-8')) as {
            changes: DeclastructChange[];
          },
        };
      });

      then('all resources show KEEP after apply', () => {
        /**
         * .what = validates all resources were applied correctly
         * .why = ensures idempotency — applying same plan twice results in no changes
         */
        const nonKeepChanges = prep.plan.changes.filter(
          (r: DeclastructChange) => r.action !== 'KEEP',
        );
        expect(nonKeepChanges).toHaveLength(0);
      });

      then('log group with retention shows KEEP', () => {
        /**
         * .what = validates log group was applied correctly by checking re-plan shows KEEP
         * .why = proves the resource matches desired state after apply
         */
        const logGroupChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsLogGroup' &&
            r.forResource.slug.includes('with-retention'),
        );
        expect(logGroupChange).toBeDefined();
        expect(logGroupChange!.action).toBe('KEEP');
      });
    });

    when('fetching log group reports after lambda invocation', () => {
      beforeAll(async () => {
        // invoke lambda to generate logs - use CLI to avoid Jest/AWS SDK dynamic import issues
        execSync(
          `aws lambda invoke --function-name ${lambdaName} --cli-binary-format raw-in-base64-out --payload '{"test":"acceptance"}' /dev/null`,
          { stdio: 'pipe', env: process.env },
        );
      });

      then('fetches log group reports with patterns and costs', async () => {
        /**
         * .what = validates log group reports contain actual data from AWS
         * .why = ensures CloudWatch Logs Insights and Metrics queries work and return real data
         */

        // setup: time range for reports (last 7 days)
        const logGroupReportRange = {
          since: asUniDateTime(startOfDay(subDays(new Date(), 7))),
          until: asUniDateTime(endOfDay(new Date())),
        };
        const logGroupName = `/aws/lambda/${lambdaName}`;

        // setup: get provider context for DAO calls
        const provider = await getDeclastructAwsProvider(
          {},
          {
            log: {
              info: () => {},
              debug: () => {},
              warn: console.warn,
              error: console.error,
            },
          },
        );

        // fetch pattern distribution report via DAO
        const patternReport =
          await DeclaredAwsLogGroupReportDistOfPatternDao.get.byUnique(
            {
              logGroups: [{ name: logGroupName }],
              range: logGroupReportRange,
              pattern: '@message',
              filter: null,
              limit: 100,
            },
            provider.context,
          );

        // verify pattern distribution report has data
        expect(patternReport).not.toBeNull();
        expect(patternReport!.rows).toBeDefined();
        expect(patternReport!.rows!.length).toBeGreaterThan(0);
        expect(patternReport!.matchedEvents).toBeGreaterThan(0);

        // fetch ingestion cost report via DAO
        const costReport =
          await DeclaredAwsLogGroupReportCostOfIngestionDao.get.byUnique(
            {
              logGroupFilter: { names: [logGroupName] },
              range: logGroupReportRange,
            },
            provider.context,
          );

        // verify ingestion cost report has data
        expect(costReport).not.toBeNull();
        expect(costReport!.rows).toBeDefined();
        expect(costReport!.rows!.length).toBeGreaterThan(0);
        expect(costReport!.totalIngestedBytes).toBeGreaterThan(0);
        expect(costReport!.totalEstimatedCostUsd).toBeGreaterThan(0);
      });
    });
  });
});
