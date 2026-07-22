import { asUniDateTime } from '@ehmpathy/uni-time';
import { execSync } from 'child_process';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import type { DeclastructChange } from 'declastruct';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { genLogMethods, LogLevel } from 'sdk-logs';
import { given, then, useBeforeAll, when } from 'test-fns';

import { DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao } from '@src/access/daos/DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao';
import { DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao } from '@src/access/daos/DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao';
import { delParameter } from '@src/access/sdks/sdkSsm/delParameter';
import { setParameter } from '@src/access/sdks/sdkSsm/setParameter';
import { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
import { DeclaredAwsSsmParameterSecure } from '@src/domain.objects/DeclaredAwsSsmParameterSecure';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
import { setEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/setEc2InstanceSession';
import { getOneEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/getOneEc2SshKeyAuthorized';
import { setEc2SshKeyAuthorized } from '@src/domain.operations/ec2SshKeyAuthorized/setEc2SshKeyAuthorized';
import { getAllIamUserAccessKeys } from '@src/domain.operations/iamUserAccessKey/getAllIamUserAccessKeys';
import { getDeclastructAwsProvider } from '@src/domain.operations/provider/getDeclastructAwsProvider';
import { setSsmParameterSecure } from '@src/domain.operations/ssmParameterSecure/setSsmParameterSecure';

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
 * .what = runs a declastruct CLI command and captures whether it failed loud + its combined output
 * .why = the create/change-without-value and both type-confusion guard cases each drive the real
 *   CLI and assert a non-zero exit + a guard message. this folds their repeated exec+try/catch
 *   +stdout/stderr capture into one named helper (rule.prefer.wet-over-dry rule-of-three).
 */
const execDeclastructCapture = (
  command: string,
): { failed: boolean; output: string } => {
  try {
    execSync(command, { stdio: 'pipe', env: process.env });
    return { failed: false, output: '' };
  } catch (error) {
    const err = error as { stderr?: Buffer; stdout?: Buffer };
    return {
      failed: true,
      output: (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? ''),
    };
  }
};

/**
 * .what = distills the stable guard error text out of a failed CLI's noisy combined output
 * .why = the negative-path guard journeys must SNAPSHOT their error output, not only `toContain`-match
 *   it (rule.require.acceptance-journey-coverage). the raw combined stdout+stderr carries volatile
 *   tokens (temp plan-file paths stamped with a run timestamp, elapsed-time spinners, ansi escapes —
 *   both color and cursor-control like ESC[A / ESC[K from the spinner), so a snapshot of the raw text
 *   would be flaky. this strips all ansi CSI sequences and keeps only the domain error
 *   lines, so the snapshot is deterministic AND reviewable — a human sees the exact guard message a
 *   caller would, and any drift in that message surfaces in the diff.
 * .note = the filter keeps lines that carry the domain guard vocabulary; volatile path/timer/tree
 *   lines are dropped by construction, so the artifact stays stable across runs and machines.
 */
// ansi CSI escape matcher — built via RegExp from a fromCharCode ESC so no control char
// sits in a regex literal (biome noControlCharactersInRegex). strips color AND
// cursor-control (the ESC[A / ESC[K spinner residue); only readable text remains.
const ansiCsiSequence = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`,
  'g',
);

// collapses a duplicated error-class prefix. declastruct's cli renders the error class name
// AND the wrapped message (which itself already carries the class), so a guard line arrives as
// "BadRequestError: BadRequestError: x". the domain throw message is clean (no class prefix);
// the double is a render artifact. keep ONE informative class prefix, drop the redundant second.
const duplicateErrorClassPrefix = /(\b\w+Error): \1: /g;

const asGuardErrorSnapshot = (output: string): string =>
  output
    .replace(ansiCsiSequence, '')
    .replace(duplicateErrorClassPrefix, '$1: ')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) =>
      /BadRequestError|will not manage|without a value|without also a value|is a (SecureString|String), not a|StringList/.test(
        line,
      ),
    )
    .join('\n')
    .trim();

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

    // seed the secret SSM parameter once so its write-only declared resource converges to
    // KEEP. the fixture declares value=undefined (steady state), which cannot CREATE an
    // absent secret (a value is required to write). so seed a value here via upsert with the
    // SAME description + tags the fixture declares — a value write is the only way to set a
    // SecureString's description, so upsert (not findsert) guarantees the remote roundtrip
    // fields agree even if a stale secret survived a prior run. thereafter the fixture's plan
    // sees value undefined + secret present + roundtrip fields agree -> KEEP, with no
    // GetParameter and no decrypt.
    beforeAll(async () => {
      const provider = await getDeclastructAwsProvider({}, { log: testLog });
      await setSsmParameterSecure(
        {
          upsert: DeclaredAwsSsmParameterSecure.as({
            name: '/declastruct-acceptance/secure/api-token',
            value: 'declastruct-acceptance-seed-secret',
            keyId: null,
            description: 'declastruct acceptance secret',
            tags: { managedBy: 'declastruct', purpose: 'acceptance-test' },
          }),
        },
        provider.context,
      );
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
         * .what = snapshots the plan STRUCTURE (which resources) for PR vibecheck
         * .why = enables reviewers to see plan output without execution
         * .note = intentionally omits `action` — the FIRST plan runs before apply, so
         *   each resource's action depends on the live account state (absent -> CREATE,
         *   extant -> KEEP), which is not deterministic across cold/warm/self-stopped
         *   accounts. action correctness is verified deterministically by the post-apply
         *   idempotency snapshot below (every change must be KEEP). here we snapshot only
         *   the stable structure so the vibecheck never flakes on account state.
         */
        const planStructure = prep.plan.changes.map((change) => ({
          class: change.forResource.class,
          // mask time-based slugs and their hashes to prevent daily snapshot drift
          slug: (() => {
            // mask time-based slug segments — tolerant of truncation: declastruct
            // caps slug length, so a long class prefix can cut the date mid-string
            // (e.g. "since2026-07-06T000"), which a strict full-timestamp regex would
            // miss and leave a literal date that drifts daily. match from since/until
            // through any run of date chars so both full and truncated dates mask
            // mask the 32-char hash FIRST: at the raw string end it is
            // unambiguously ".<32 hex>", so it never mis-fires. this order also
            // shields the join-dot before the hash from the date mask below (whose
            // char class must therefore exclude a bare "." separator)
            const masked = change.forResource.slug
              .replace(/\.[a-f0-9]{32}$/, '.[HASH]')
              // date chars are digits/dash/T plus an optional ".<millis>Z" fraction.
              // exclude a bare "." from the run so the ".[HASH]" separator survives.
              // tolerant of truncation — declastruct caps humanPart at 128 chars, which
              // can cut a date mid-string; the optional group also matches a partial
              .replace(/since\d[\d\-T]*(\.\d+Z?)?/g, 'since[DATE]')
              .replace(/until\d[\d\-T]*(\.\d+Z?)?/g, 'until[DATE]');
            return masked;
          })(),
        }));

        // explicit assertions alongside snapshot
        expect(planStructure.length).toBeGreaterThan(0);
        expect(planStructure).toMatchSnapshot();
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
            r.forResource.class ===
            'DeclaredAwsCloudwatchLogGroupReportDistOfPattern',
        );
        expect(patternReportChange).toBeDefined();

        // verify ingestion cost report is present
        const costReportChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class ===
            'DeclaredAwsCloudwatchLogGroupReportCostOfIngestion',
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
            r.forResource.class === 'DeclaredAwsCloudwatchLogGroup' &&
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

      then('plan includes SSM parameter resources (plain + secure)', () => {
        /**
         * .what = validates plan includes both the plaintext and secret SSM parameters
         * .why = proves each is a first-class declarative resource, driven via its DAO
         *        through the plan/apply workflow (the write-only secret included)
         */
        const plainChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsSsmParameterPlain',
        );
        expect(plainChange).toBeDefined();

        const secureChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsSsmParameterSecure',
        );
        expect(secureChange).toBeDefined();
      });

      then('plan includes budget + cost resources', () => {
        /**
         * .what = validates plan includes budget, notification, alarm, and the two
         *   cost-anomaly resources
         * .why = ensures the feat-budget resources flow through the plan/apply workflow
         */
        for (const cls of [
          'DeclaredAwsBudget',
          'DeclaredAwsBudgetNotification',
          'DeclaredAwsCloudwatchMetricAlarm',
          'DeclaredAwsCostAnomalyMonitor',
          'DeclaredAwsCostAnomalySubscription',
        ]) {
          const change = prep.plan.changes.find(
            (r: DeclastructChange) => r.forResource.class === cls,
          );
          expect(change).toBeDefined();
        }
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
         * .why = ensures setCloudwatchLogGroup operation works through declastruct workflow
         */
        const logGroupChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsCloudwatchLogGroup' &&
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
            // mask time-based slug segments — tolerant of truncation: declastruct
            // caps slug length, so a long class prefix can cut the date mid-string
            // (e.g. "since2026-07-06T000"), which a strict full-timestamp regex would
            // miss and leave a literal date that drifts daily. match from since/until
            // through any run of date chars so both full and truncated dates mask
            // mask the 32-char hash FIRST: at the raw string end it is
            // unambiguously ".<32 hex>", so it never mis-fires. this order also
            // shields the join-dot before the hash from the date mask below (whose
            // char class must therefore exclude a bare "." separator)
            const masked = change.forResource.slug
              .replace(/\.[a-f0-9]{32}$/, '.[HASH]')
              // date chars are digits/dash/T plus an optional ".<millis>Z" fraction.
              // exclude a bare "." from the run so the ".[HASH]" separator survives.
              // tolerant of truncation — declastruct caps humanPart at 128 chars, which
              // can cut a date mid-string; the optional group also matches a partial
              .replace(/since\d[\d\-T]*(\.\d+Z?)?/g, 'since[DATE]')
              .replace(/until\d[\d\-T]*(\.\d+Z?)?/g, 'until[DATE]');
            return masked;
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
            r.forResource.class === 'DeclaredAwsCloudwatchLogGroup' &&
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

      then('SSM parameters (plain + secure) show KEEP', () => {
        /**
         * .what = validates both SSM parameters match desired state after apply
         * .why = proves plaintext (value-compare) and secret (write-only) are idempotent
         *        through plan/apply — the secret converges to KEEP via metadata only, with
         *        no GetParameter and no kms:Decrypt, and its declared value stays undefined
         */
        const plainChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsSsmParameterPlain',
        );
        expect(plainChange).toBeDefined();
        expect(plainChange!.action).toBe('KEEP');

        const secureChange = prep.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsSsmParameterSecure',
        );
        expect(secureChange).toBeDefined();
        expect(secureChange!.action).toBe('KEEP');
      });

      then('budget + cost resources show KEEP', () => {
        /**
         * .what = validates the feat-budget resources match desired state after apply
         * .why = proves budget, notification, alarm, the cost-anomaly resources, and the
         *        budget-action guard are idempotent through plan/apply — re-plan
         *        converges to KEEP (no drift)
         */
        for (const cls of [
          'DeclaredAwsBudget',
          'DeclaredAwsBudgetNotification',
          'DeclaredAwsCloudwatchMetricAlarm',
          'DeclaredAwsCostAnomalyMonitor',
          'DeclaredAwsCostAnomalySubscription',
          'DeclaredAwsBudgetAction',
        ]) {
          const change = prep.plan.changes.find(
            (r: DeclastructChange) => r.forResource.class === cls,
          );
          expect(change).toBeDefined();
          expect(change!.action).toBe('KEEP');
        }
      });

      // SCP tests skipped — require management account credentials (see resources.acceptance.ts)
    });

    when('apply on a secret created with no value', () => {
      // drive the REAL declastruct CLI end to end against a create-without-value secret:
      //   plan must report CREATE (metadata-only, no read), then apply must fail loud with the
      //   guard message — the user-faced error path per rule.forbid.friction-hazards. this is
      //   blackbox-via-contract (the CLI), so it also honors rule.require.test-coverage-by-grain.
      const guardResourcesFile = join(
        __dirname,
        '.test',
        'assets',
        'resources.create-without-value.ts',
      );
      const guardName =
        '/declastruct-acceptance/secure/create-without-value-guard';

      const outcome = useBeforeAll(async () => {
        // ensure the name is absent so apply is forced to CREATE (and hit the guard)
        const provider = await getDeclastructAwsProvider({}, { log: testLog });
        await delParameter({ name: guardName }, provider.context);

        // plan should succeed (metadata-only) and report CREATE
        const guardPlanFile = join(testDir, 'plan.create-without-value.json');
        execSync(
          `npx declastruct plan --wish ${guardResourcesFile} --into ${guardPlanFile}`,
          { stdio: 'pipe', env: process.env },
        );
        const plan = JSON.parse(readFileSync(guardPlanFile, 'utf-8')) as {
          changes: DeclastructChange[];
        };

        // apply MUST fail loud — capture the CLI's non-zero exit + combined output
        const apply = execDeclastructCapture(
          `npx declastruct apply --plan ${guardPlanFile}`,
        );
        return { plan, apply };
      });

      then('plan reports CREATE for the absent secret (metadata only)', () => {
        const change = outcome.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsSsmParameterSecure',
        );
        expect(change).toBeDefined();
        expect(change!.action).toBe('CREATE');
      });

      then(
        'apply fails loud with the create-without-value guard message',
        () => {
          expect(outcome.apply.failed).toBe(true);
          expect(outcome.apply.output).toContain(
            'cannot create a secret parameter without a value',
          );
        },
      );

      then('the create-without-value error matches snapshot', () => {
        expect(asGuardErrorSnapshot(outcome.apply.output)).toMatchSnapshot();
      });
    });

    when('apply on a secret changed with no value', () => {
      // the second user-faced secure error path: aws re-encrypts a SecureString only on a
      //   value write, so a keyId/description change with no value cannot be honored — the
      //   orchestrator fails loud. seed the secret with one description + a value, then drive
      //   the REAL CLI with a changed description + no value: plan shows UPDATE, apply fails
      //   loud. blackbox-via-contract, per rule.forbid.friction-hazards.
      const guardResourcesFile = join(
        __dirname,
        '.test',
        'assets',
        'resources.change-without-value.ts',
      );
      const guardName =
        '/declastruct-acceptance/secure/change-without-value-guard';

      const outcome = useBeforeAll(async () => {
        // seed the secret WITH a value + the ORIGINAL description, so it exists and its
        //   description differs from the wish's 'changed description'
        const provider = await getDeclastructAwsProvider({}, { log: testLog });
        await setSsmParameterSecure(
          {
            upsert: DeclaredAwsSsmParameterSecure.as({
              name: guardName,
              value: 'seed-secret-value',
              keyId: null,
              description: 'original description',
              tags: null,
            }),
          },
          provider.context,
        );

        // plan should succeed (metadata-only) and report UPDATE (description differs)
        const guardPlanFile = join(testDir, 'plan.change-without-value.json');
        execSync(
          `npx declastruct plan --wish ${guardResourcesFile} --into ${guardPlanFile}`,
          { stdio: 'pipe', env: process.env },
        );
        const plan = JSON.parse(readFileSync(guardPlanFile, 'utf-8')) as {
          changes: DeclastructChange[];
        };

        // apply MUST fail loud — capture the CLI's non-zero exit + combined output
        const apply = execDeclastructCapture(
          `npx declastruct apply --plan ${guardPlanFile}`,
        );
        return { plan, apply };
      });

      then('plan reports UPDATE for the changed description', () => {
        const change = outcome.plan.changes.find(
          (r: DeclastructChange) =>
            r.forResource.class === 'DeclaredAwsSsmParameterSecure',
        );
        expect(change).toBeDefined();
        expect(change!.action).toBe('UPDATE');
      });

      then(
        'apply fails loud with the keyId/description-change guard message',
        () => {
          expect(outcome.apply.failed).toBe(true);
          expect(outcome.apply.output).toContain(
            'cannot change the keyId or description of a secret without also a value write',
          );
        },
      );

      then('the change-without-value error matches snapshot', () => {
        expect(asGuardErrorSnapshot(outcome.apply.output)).toMatchSnapshot();
      });

      afterAll(async () => {
        // cleanup the seeded secret (this wish never wrote a value, so the seed persists)
        const provider = await getDeclastructAwsProvider({}, { log: testLog });
        await delParameter({ name: guardName }, provider.context);
      });
    });

    when('a secret value is rotated and a plain value is changed', () => {
      // the POSITIVE twin of the create/change-without-value guards. those prove the ERROR path
      //   at the CLI grain; this proves the SUCCESS path: supply a NEW value and the secret
      //   rotates end-to-end through the real `declastruct plan`/`apply` (write-only UPDATE, no
      //   plaintext read) — the headline journey the vision sells. it also covers the plain
      //   value-compare UPDATE, so the positive-update path is snapped, not only its error twins.
      //   blackbox-via-contract: seed via internal op (setup, allowed), drive plan+apply via CLI.
      const rotateResourcesFile = join(
        __dirname,
        '.test',
        'assets',
        'resources.rotate-secret.ts',
      );
      const secureName = '/declastruct-acceptance/secure/rotate';
      const plainName = '/declastruct-acceptance/plain/rotate';

      const outcome = useBeforeAll(async () => {
        const provider = await getDeclastructAwsProvider({}, { log: testLog });
        const context = provider.context;

        // seed BOTH with an ORIGINAL value so each EXISTS -> plan reports UPDATE (not CREATE).
        //   the secret is write-only (a present value always plans UPDATE); the plain differs by
        //   value so value-compare reports UPDATE.
        await setSsmParameterSecure(
          {
            upsert: DeclaredAwsSsmParameterSecure.as({
              name: secureName,
              value: 'rotate-old-secret',
              keyId: null,
              description: null,
              tags: null,
            }),
          },
          context,
        );
        await setParameter(
          {
            name: plainName,
            value: 'rotate-old-plain',
            type: 'String',
            overwrite: true,
          },
          context,
        );

        // plan via the REAL CLI -> both should report UPDATE
        const rotatePlanFile = join(testDir, 'plan.rotate-secret.json');
        execSync(
          `npx declastruct plan --wish ${rotateResourcesFile} --into ${rotatePlanFile}`,
          { stdio: 'pipe', env: process.env },
        );
        const plan = JSON.parse(readFileSync(rotatePlanFile, 'utf-8')) as {
          changes: DeclastructChange[];
        };

        // apply via the REAL CLI -> must SUCCEED (the positive path writes the new values)
        const apply = execDeclastructCapture(
          `npx declastruct apply --plan ${rotatePlanFile}`,
        );
        return { plan, apply };
      });

      then(
        'plan reports UPDATE for both the secret and the plain value',
        () => {
          const summary = outcome.plan.changes
            .filter(
              (r: DeclastructChange) =>
                r.forResource.slug.includes('rotate') &&
                (r.forResource.class === 'DeclaredAwsSsmParameterSecure' ||
                  r.forResource.class === 'DeclaredAwsSsmParameterPlain'),
            )
            .map((r: DeclastructChange) => ({
              action: r.action,
              class: r.forResource.class,
            }))
            .sort((a, b) => a.class.localeCompare(b.class));
          expect(summary).toHaveLength(2);
          expect(summary.every((c) => c.action === 'UPDATE')).toBe(true);
          expect(summary).toMatchSnapshot();
        },
      );

      then('plan reports UPDATE for the plain value', () => {
        // isolates the Plain value-compare UPDATE decision (the twin `then` above snaps
        //   Plain+Secure together). reuses the SAME plan — no extra CLI call, no extra AWS
        //   resource — so the plain positive-UPDATE path has a dedicated, non-bundled snapshot.
        const plainOnly = outcome.plan.changes
          .filter(
            (r: DeclastructChange) =>
              r.forResource.slug.includes('rotate') &&
              r.forResource.class === 'DeclaredAwsSsmParameterPlain',
          )
          .map((r: DeclastructChange) => ({
            action: r.action,
            class: r.forResource.class,
          }));
        expect(plainOnly).toHaveLength(1);
        expect(plainOnly[0]!.action).toBe('UPDATE');
        expect(plainOnly).toMatchSnapshot();
      });

      then('apply succeeds — the value rotate is written', () => {
        expect(outcome.apply.failed).toBe(false);
      });

      afterAll(async () => {
        const provider = await getDeclastructAwsProvider({}, { log: testLog });
        await delParameter({ name: secureName }, provider.context);
        await delParameter({ name: plainName }, provider.context);
      });
    });

    when(
      'plan runs on a Plain resource declared at a SecureString name',
      () => {
        // the type-confusion guard — the scariest user-faced path. a Plain declared at a name that
        //   holds a SecureString would read the ciphertext as a value and let a later write
        //   DOWNGRADE the secret. the guard fires at PLAN time (getOneSsmParameterPlain), so the
        //   real `declastruct plan` itself fails loud. blackbox-via-contract, per
        //   rule.forbid.friction-hazards.
        const guardResourcesFile = join(
          __dirname,
          '.test',
          'assets',
          'resources.type-confusion-plain.ts',
        );
        const guardName =
          '/declastruct-acceptance/type-confusion/plain-at-secure';

        const outcome = useBeforeAll(async () => {
          const provider = await getDeclastructAwsProvider(
            {},
            { log: testLog },
          );
          // seed a SecureString at the name the Plain wish will claim
          await setParameter(
            {
              name: guardName,
              value: 'super-secret-value',
              type: 'SecureString',
              overwrite: true,
            },
            provider.context,
          );

          // plan MUST fail loud (the guard fires on the getOne read) — capture exit + output
          const guardPlanFile = join(testDir, 'plan.type-confusion-plain.json');
          const plan = execDeclastructCapture(
            `npx declastruct plan --wish ${guardResourcesFile} --into ${guardPlanFile}`,
          );
          return { plan };
        });

        then(
          'plan fails loud — a SecureString is never managed as a String',
          () => {
            expect(outcome.plan.failed).toBe(true);
            expect(outcome.plan.output).toContain(
              'is a SecureString, not a String',
            );
          },
        );

        then('the type-confusion (plain@secure) error matches snapshot', () => {
          expect(asGuardErrorSnapshot(outcome.plan.output)).toMatchSnapshot();
        });

        afterAll(async () => {
          const provider = await getDeclastructAwsProvider(
            {},
            { log: testLog },
          );
          await delParameter({ name: guardName }, provider.context);
        });
      },
    );

    when('plan runs on a Secure resource declared at a String name', () => {
      // the mirror direction — a Secure declared at a plaintext String name would misroute a
      //   non-secret into the write-only flow. the guard fires at PLAN time
      //   (getOneSsmParameterSecure), so the real `declastruct plan` itself fails loud.
      const guardResourcesFile = join(
        __dirname,
        '.test',
        'assets',
        'resources.type-confusion-secure.ts',
      );
      const guardName =
        '/declastruct-acceptance/type-confusion/secure-at-plain';

      const outcome = useBeforeAll(async () => {
        const provider = await getDeclastructAwsProvider({}, { log: testLog });
        // seed a plaintext String at the name the Secure wish will claim
        await setParameter(
          {
            name: guardName,
            value: 'not-a-secret',
            type: 'String',
            overwrite: true,
          },
          provider.context,
        );

        const guardPlanFile = join(testDir, 'plan.type-confusion-secure.json');
        const plan = execDeclastructCapture(
          `npx declastruct plan --wish ${guardResourcesFile} --into ${guardPlanFile}`,
        );
        return { plan };
      });

      then(
        'plan fails loud — a String is never managed as a SecureString',
        () => {
          expect(outcome.plan.failed).toBe(true);
          expect(outcome.plan.output).toContain(
            'is a String, not a SecureString',
          );
        },
      );

      then('the type-confusion (secure@plain) error matches snapshot', () => {
        expect(asGuardErrorSnapshot(outcome.plan.output)).toMatchSnapshot();
      });

      afterAll(async () => {
        const provider = await getDeclastructAwsProvider({}, { log: testLog });
        await delParameter({ name: guardName }, provider.context);
      });
    });

    when('log group reports are fetched after lambda invocation', () => {
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
          await DeclaredAwsCloudwatchLogGroupReportDistOfPatternDao.get.one.byUnique(
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
          await DeclaredAwsCloudwatchLogGroupReportCostOfIngestionDao.get.one.byUnique(
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
