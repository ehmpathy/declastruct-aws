import { asUniDateTime } from '@ehmpathy/uni-time';
import { execSync } from 'child_process';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import type { DeclastructChange } from 'declastruct';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { genLogMethods, LogLevel } from 'sdk-logs';
import { given, then, useBeforeAll, when } from 'test-fns';

import { DeclaredAwsLogGroupReportCostOfIngestionDao } from '@src/access/daos/DeclaredAwsLogGroupReportCostOfIngestionDao';
import { DeclaredAwsLogGroupReportDistOfPatternDao } from '@src/access/daos/DeclaredAwsLogGroupReportDistOfPatternDao';
import { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
import { setEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/setEc2InstanceSession';
import { getOneEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/getOneEc2SshKeyAuthorized';
import { setEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/setEc2SshKeyAuthorized';
import { getAllIamUserAccessKeys } from '@src/domain.operations/iamUserAccessKey/getAllIamUserAccessKeys';
import { getDeclastructAwsProvider } from '@src/domain.operations/provider/getDeclastructAwsProvider';

/**
 * .what = the exid, comment, and public key of the acceptance ssh key authorization
 * .why = must match resources.acceptance.ts so the seed lands on the same param the
 *   declared resource reads; see that file's ec2SshKeyAuthorized .seed / .reseed notes
 */
const ACCEPTANCE_INSTANCE_EXID = 'declastruct-acceptance-instance';
const ACCEPTANCE_NAT_EXID = 'declastruct-acceptance-nat';
const ACCEPTANCE_SSH_KEY_COMMENT = 'declastruct-acceptance-seed';
const ACCEPTANCE_SSH_PUBLIC_KEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAID5+jzBfFTQMe+mQrsxNcg93UbqhqV8sCb8e+sG47JCD declastruct-acceptance-seed';

/**
 * .what = a silent log for provider context in test setup
 * .why = keeps seed setup quiet; real warnings and errors still reach the console
 */
const testLog = genLogMethods({ level: { minimum: LogLevel.WARN } });

/**
 * .what = acceptance tests for declastruct CLI workflow
 * .why = validates end-to-end usage of declastruct-aws with declastruct CLI
 * .note = requires AWS_PROFILE via: `source .agent/repo=.this/skills/use.demo.awsprofile.sh`
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

    // seed the ssh key authorization once so its declared resource converges to KEEP
    // note: the durable append runs over SSM and so needs a RUNNING instance, but this
    //   fixture keeps the instance stopped for cost. so seed here (start -> authorize ->
    //   the fixture apply stops it again; the key stays on the EBS disk + is recorded in
    //   the param track layer). thereafter DAO.findsert finds the param -> KEEP, no cost.
    //   see resources.acceptance.ts ec2SshKeyAuthorized .seed/.reseed for the full story.
    beforeAll(async () => {
      const provider = await getDeclastructAwsProvider({}, { log: testLog });
      const context = provider.context;

      // ensure the NAT is active FIRST, unconditionally — before the seed check and
      // before any plan runs. the NAT self-stops (90-min idle timer for cost), and
      // when stopped AWS releases its public IP and blackholes its route, so the plan
      // would show the NAT instance (publicIpEnabled) + private route table (the NAT
      // route) as UPDATE — a flaky snapshot that depends on whether the idle timer has
      // fired since the last run. start it (idempotent: setEc2InstanceSession is a
      // cheap no-op when already active, and waits until the box is active when not)
      // so the plan always sees it active -> KEEP. it also gives the acceptance
      // instance egress for the key seed below.
      const nat = await getEc2Instance(
        { by: { unique: { exid: ACCEPTANCE_NAT_EXID } } },
        context,
      );
      if (nat)
        await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { exid: ACCEPTANCE_NAT_EXID },
              status: 'active',
            }),
          },
          context,
        );

      const unique = {
        instance: { exid: ACCEPTANCE_INSTANCE_EXID },
        comment: ACCEPTANCE_SSH_KEY_COMMENT,
      };

      // skip the key seed if already seeded — cheap param lookup, zero cost
      const seeded = await getOneEc2SshKeyAuthorized(
        { by: { unique } },
        context,
      );
      if (seeded) return;

      // skip if the instance does not exist yet — a fresh account creates it via the
      //   apply below (the key fails that first run); a re-run then seeds here
      const instance = await getEc2Instance(
        { by: { unique: unique.instance } },
        context,
      );
      if (!instance) return;

      // seed: start the target instance so the SSM append can reach it, then authorize
      await setEc2InstanceSession(
        {
          session: DeclaredAwsEc2InstanceSession.as({
            instance: { exid: ACCEPTANCE_INSTANCE_EXID },
            status: 'active',
          }),
        },
        context,
      );

      // retry the push until the ssm agent registers after boot
      for (let attempt = 1; attempt <= 10; attempt++) {
        try {
          await setEc2SshKeyAuthorized(
            DeclaredAwsEc2SshKeyAuthorized.as({
              instance: { exid: ACCEPTANCE_INSTANCE_EXID },
              publicKey: ACCEPTANCE_SSH_PUBLIC_KEY,
              comment: ACCEPTANCE_SSH_KEY_COMMENT,
              user: 'ec2-user',
            }),
            context,
          );
          break;
        } catch (error) {
          if (attempt === 10) throw error;
          await new Promise((done) => setTimeout(done, 15_000));
        }
      }

      // stop the instance again so the plan matches its declared stopped state.
      // note: the seed started it to append the key over SSM; if left active, the
      //   first plan would show the session as UPDATE (active vs declared stopped),
      //   which flips to KEEP on later already-seeded runs — a flaky snapshot. stop
      //   it here so every run's plan converges to the same stopped -> KEEP shape.
      await setEc2InstanceSession(
        {
          session: DeclaredAwsEc2InstanceSession.as({
            instance: { exid: ACCEPTANCE_INSTANCE_EXID },
            status: 'stopped',
          }),
        },
        context,
      );
    }, 600_000);

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

      then('plan structure matches snapshot', () => {
        /**
         * .what = snapshots the plan structure for PR vibecheck
         * .why = enables reviewers to see plan output without execution
         */
        const planSummary = prep.plan.changes.map((change) => ({
          action: change.action,
          class: change.forResource.class,
          // mask time-based slugs and their hashes to prevent daily snapshot drift
          slug: (() => {
            const masked = change.forResource.slug
              .replace(/since\d{4}-\d{2}-\d{2}T\d{6}\.\d{3}Z/g, 'since[DATE]')
              .replace(/until\d{4}-\d{2}-\d{2}T/g, 'until[DATE]');
            // mask final hash for stable snapshots
            return masked.replace(/\.[a-f0-9]{32}$/, '.[HASH]');
          })(),
        }));

        // explicit assertions alongside snapshot
        expect(planSummary.length).toBeGreaterThan(0);
        expect(planSummary).toMatchSnapshot();
      });

      then('plan includes VPC infrastructure resources', () => {
        /**
         * .what = validates plan includes VPC, subnet, security group, internet gateway, route table
         * .why = ensures declastruct correctly processes VPC infrastructure declarations
         */
        const vpcChange = prep.plan.changes.find(
          (r: DeclastructChange) => r.forResource.class === 'DeclaredAwsVpc',
        );
        expect(vpcChange).toBeDefined();
        expect(vpcChange!.forResource.slug).toContain(
          'declastruct-acceptance-vpc',
        );

        const subnetChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsVpcSubnet',
        );
        expect(subnetChange).toBeDefined();

        const sgChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsVpcSecurityGroup',
        );
        expect(sgChange).toBeDefined();

        const igwChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsVpcInternetGateway',
        );
        expect(igwChange).toBeDefined();

        const rtbChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsVpcRouteTable',
        );
        expect(rtbChange).toBeDefined();
      });

      // VPC tunnel skipped — require vpc, bastion machine, and rds db in demo account
      // then('plan includes VPC tunnel resource', () => {
      //   /**
      //    * .what = validates plan includes VPC tunnel declaration
      //    * .why = ensures declastruct correctly processes AWS resource declarations
      //    */
      //   const tunnelResource = prep.plan.changes.find(
      //     (r: DeclastructChange) =>
      //       r.forResource.class === 'DeclaredAwsSsmVpcTunnel',
      //   );
      //   expect(tunnelResource).toBeDefined();
      //   expect(tunnelResource!.forResource.slug).toContain(
      //     'DeclaredAwsSsmVpcTunnel',
      //   );
      // });

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

      then('plan includes EC2 infrastructure resources', () => {
        /**
         * .what = validates plan includes EC2 launch template, instance, and session
         * .why = ensures EC2 infrastructure declarations are captured in plan
         */

        // verify launch template resource is present
        // note: two launch templates exist (nat + instance); match the instance
        //   one by its exid so the NAT template is not picked up by class alone
        const templateChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2LaunchTemplate' &&
            r.forResource.slug.includes('declastruct-acceptance-template'),
        );
        expect(templateChange).toBeDefined();
        expect(templateChange!.forResource.slug).toContain(
          'declastruct-acceptance-template',
        );

        // verify instance resource is present
        // note: two instances exist (nat + acceptance); match by exid so the NAT
        //   instance is not picked up by class alone
        const instanceChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2Instance' &&
            r.forResource.slug.includes('declastruct-acceptance-instance'),
        );
        expect(instanceChange).toBeDefined();
        expect(instanceChange!.forResource.slug).toContain(
          'declastruct-acceptance-instance',
        );

        // verify instance session resource is present
        const sessionChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2InstanceSession',
        );
        expect(sessionChange).toBeDefined();
      });

      then('plan includes SSM SSH tunnel resource', () => {
        /**
         * .what = validates plan includes the declared SSM SSH tunnel
         * .why = proves the tunnel is a first-class declarative resource, driven
         *        via DeclaredAwsSsmSshTunnelDao through the plan/apply workflow
         */
        const tunnelChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsSsmSshTunnel',
        );
        expect(tunnelChange).toBeDefined();
      });

      then('plan includes SSH key authorization resource', () => {
        /**
         * .what = validates plan includes the declared SSH key authorization
         * .why = proves the ssh key is a first-class declarative resource, driven
         *        via DeclaredAwsEc2SshKeyAuthorizedDao through the plan/apply workflow
         */
        const keyChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2SshKeyAuthorized',
        );
        expect(keyChange).toBeDefined();
      });

      /**
       * .skip = SSH key resource uses direct operations, not declastruct plan/apply
       *   - setEc2SshKeyAuthorized stores key in SSM Parameter Store
       *   - verify via integration tests in ec2SshKeyAuthorized.integration.test.ts
       */

      // SCP tests skipped — require management account credentials (see resources.acceptance.ts)
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

      // TODO: provision vpc, bastion machine, and rds db in demo account
      // then('opens VPC tunnel and verifies it is active', () => {
      //   /**
      //    * .what = validates declastruct apply command works with AWS provider
      //    * .why = ensures end-to-end workflow from plan to reality
      //    * .note = opens tunnel via SSM port forwarding
      //    */
      //   const tunnelChange = prep.plan.changes.find(
      //     (r: DeclastructChange) =>
      //       r.forResource.class === 'DeclaredAwsSsmVpcTunnel',
      //   );
      //   expect(tunnelChange).toBeDefined();
      // });

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

      then('applies EC2 infrastructure resources', () => {
        /**
         * .what = validates EC2 launch template, instance, and session are applied
         * .why = ensures EC2 infrastructure works through declastruct workflow
         */

        // check launch template was applied
        const templateChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2LaunchTemplate',
        );
        expect(templateChange).toBeDefined();

        // check instance was applied
        const instanceChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2Instance',
        );
        expect(instanceChange).toBeDefined();

        // check session was applied
        const sessionChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2InstanceSession',
        );
        expect(sessionChange).toBeDefined();
      });

      // SCP tests skipped — require management account credentials (see resources.acceptance.ts)

      then('is idempotent - apply same plan twice succeeds', () => {
        /**
         * .what = validates apply of the same plan multiple times is safe
         * .why = ensures declastruct operations follow idempotency requirements
         */

        // apply plan second time - should succeed without errors
        const result = execSync(`npx declastruct apply --plan ${planFile}`, {
          encoding: 'utf-8',
          env: process.env,
        });

        // explicit assertion: command completed and returned output
        expect(typeof result).toBe('string');
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
         * .why = ensures idempotency — same plan applied twice results in no changes
         */
        const nonKeepChanges = prep.plan.changes.filter(
          (r: DeclastructChange) => r.action !== 'KEEP',
        );
        expect(nonKeepChanges).toHaveLength(0);
      });

      then('idempotent plan structure matches snapshot', () => {
        /**
         * .what = snapshots the post-apply plan for PR vibecheck
         * .why = proves all resources reached KEEP state (no drift)
         */
        const planSummary = prep.plan.changes.map((change) => ({
          action: change.action,
          class: change.forResource.class,
          // mask time-based slugs and their hashes to prevent daily snapshot drift
          slug: (() => {
            const masked = change.forResource.slug
              .replace(/since\d{4}-\d{2}-\d{2}T\d{6}\.\d{3}Z/g, 'since[DATE]')
              .replace(/until\d{4}-\d{2}-\d{2}T/g, 'until[DATE]');
            // mask final hash for stable snapshots
            return masked.replace(/\.[a-f0-9]{32}$/, '.[HASH]');
          })(),
        }));

        // explicit assertions alongside snapshot: all resources should be KEEP
        expect(planSummary.length).toBeGreaterThan(0);
        expect(planSummary.every((c) => c.action === 'KEEP')).toBe(true);
        expect(planSummary).toMatchSnapshot();
      });

      then('log group with retention shows KEEP', () => {
        /**
         * .what = validates log group was applied correctly via re-plan KEEP assertion
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

      then('EC2 infrastructure resources show KEEP', () => {
        /**
         * .what = validates EC2 resources were applied correctly via re-plan KEEP assertion
         * .why = proves EC2 launch template, instance, and session match desired state
         */
        const templateChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2LaunchTemplate',
        );
        expect(templateChange).toBeDefined();
        expect(templateChange!.action).toBe('KEEP');

        const instanceChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2Instance',
        );
        expect(instanceChange).toBeDefined();
        expect(instanceChange!.action).toBe('KEEP');

        const sessionChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2InstanceSession',
        );
        expect(sessionChange).toBeDefined();
        expect(sessionChange!.action).toBe('KEEP');
      });

      then('SSM SSH tunnel shows KEEP', () => {
        /**
         * .what = validates the CLOSED SSH tunnel matches desired state after apply
         * .why = proves the tunnel is idempotent through plan/apply — a CLOSED
         *        tunnel has no subprocess, so re-plan converges to KEEP (no drift)
         */
        const tunnelChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsSsmSshTunnel',
        );
        expect(tunnelChange).toBeDefined();
        expect(tunnelChange!.action).toBe('KEEP');
      });

      then('SSH key authorization shows KEEP', () => {
        /**
         * .what = validates the seeded ssh key matches desired state after apply
         * .why = proves the ssh key is idempotent through plan/apply — findsert finds
         *        the seeded param and skips the re-push, so re-plan converges to KEEP
         */
        const keyChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsEc2SshKeyAuthorized',
        );
        expect(keyChange).toBeDefined();
        expect(keyChange!.action).toBe('KEEP');
      });

      // SCP tests skipped — require management account credentials (see resources.acceptance.ts)
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
        const provider = await getDeclastructAwsProvider({}, { log: testLog });

        // fetch pattern distribution report via DAO
        const patternReport =
          await DeclaredAwsLogGroupReportDistOfPatternDao.get.one.byUnique(
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
          await DeclaredAwsLogGroupReportCostOfIngestionDao.get.one.byUnique(
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

    when('verifying IAM access keys were purged via del()', () => {
      then('no access keys remain in account after apply', async () => {
        /**
         * .what = validates access keys were deleted by declastruct apply
         * .why = ensures the del() wrapper results in actual deletion
         * .note = resources.acceptance.ts wraps all keys with del() to mark for deletion
         */

        // get provider context
        const provider = await getDeclastructAwsProvider({}, { log: testLog });

        // verify no access keys remain
        const keysAfter = await getAllIamUserAccessKeys(
          { by: { account: { id: provider.context.aws.credentials.account } } },
          provider.context,
        );
        expect(keysAfter.length).toBe(0);
        console.log('all access keys purged successfully via del()');
      });
    });
  });
});
