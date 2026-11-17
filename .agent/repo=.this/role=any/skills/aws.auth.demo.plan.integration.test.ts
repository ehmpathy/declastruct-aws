import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { given, then, when } from 'test-fns';

const SKILL_PATH = path.join(__dirname, 'aws.auth.demo.plan.sh');

/**
 * .what = the plan files the fake declastruct writes, by FAKE_PLAN_SHAPE
 * .why  = the tally is the applier's gate; each shape it must read is one
 *         a plan can hold: the gate itself, a STOP, the settled re-plan,
 *         an empty plan, and a file that is not json
 */
const asPlanBody = (
  changes: Array<{ action: string; slug: string; difference?: string }>,
): string =>
  JSON.stringify({
    changes: changes.map((change) => ({
      forResource: { slug: change.slug },
      action: change.action,
      state: { difference: change.difference ?? null }, // only an UPDATE carries one
    })),
  });

// slugs copied from a real demo plan (class, unique key, hash); none holds an
// account id
const SLUG_GROVE = 'DeclaredAwsIamRole.ehmpathy-demo-for-grove.4ee0beb0c33754559e9bba6272954a8b';
const SLUG_OIDC = 'DeclaredAwsIamRole.ehmpathy-demo-oidc.b74430ee657154c8a053b3d7e0075ce0';
const SLUG_GROVE_ATTACHED =
  'DeclaredAwsIamRolePolicyAttachedInline.ehmpathy-demo-for-grove-extension.nameehmpathy-demo-for-grove.a4a571ade648590da31a5c74bae4a07b';

// the diff shape declastruct writes, cut to the trust; the principal is the
// public fixture, never a real identity
const asTrustDifference = (input: { lines: string[] }): string =>
  [
    '- Remote',
    '+ Desired',
    '',
    '  DeclaredAwsIamRole {',
    '    "name": "ehmpathy-demo-for-grove",',
    '    "policies": Array [',
    '      DeclaredAwsIamPolicyStatement {',
    ...input.lines,
    '      },',
    '    ],',
    '  }',
  ].join('\n');
const DIFF_ACTION_ONLY = asTrustDifference({
  lines: [
    '        "principal": DeclaredAwsIamPrincipal {',
    '          "aws": "arn:aws:iam::000000000000:role/example-camp-grove-role",',
    '        },',
    '-       "action": "sts:AssumeRole",',
    '+       "action": Array [',
    '+         "sts:AssumeRole",',
    '+         "sts:TagSession",',
    '+         "sts:SetSourceIdentity",',
    '+       ],',
  ],
});
const DIFF_PRINCIPAL_TOO = asTrustDifference({
  lines: [
    '        "principal": DeclaredAwsIamPrincipal {',
    '-         "aws": "arn:aws:iam::000000000000:role/example-camp-grove-role",',
    '+         "aws": "arn:aws:iam::111111111111:role/example-wrong-role",',
    '        },',
    '-       "action": "sts:AssumeRole",',
    '+       "action": Array [',
    '+         "sts:AssumeRole",',
    '+         "sts:TagSession",',
    '+         "sts:SetSourceIdentity",',
    '+       ],',
  ],
});

const PLAN_SHAPES: Record<string, string> = {
  gate: asPlanBody([
    { action: 'UPDATE', slug: SLUG_GROVE, difference: DIFF_ACTION_ONLY },
    { action: 'KEEP', slug: SLUG_OIDC },
    { action: 'KEEP', slug: SLUG_GROVE_ATTACHED },
  ]),
  drift: asPlanBody([
    { action: 'UPDATE', slug: SLUG_GROVE, difference: DIFF_PRINCIPAL_TOO },
    { action: 'KEEP', slug: SLUG_OIDC },
  ]),
  // the role was deleted by hand: the plan would recreate it and its
  // attachment, and the oidc role drifted too
  stop: asPlanBody([
    { action: 'CREATE', slug: SLUG_GROVE },
    { action: 'CREATE', slug: SLUG_GROVE_ATTACHED },
    { action: 'UPDATE', slug: SLUG_OIDC, difference: DIFF_ACTION_ONLY },
  ]),
  nodiff: asPlanBody([{ action: 'UPDATE', slug: SLUG_GROVE }]),
  settled: asPlanBody([
    { action: 'KEEP', slug: SLUG_GROVE },
    { action: 'KEEP', slug: SLUG_OIDC },
  ]),
  empty: asPlanBody([]),
  malformed: '{"changes": [',
};

/**
 * .mock = the three external commands the skill shells out to: `rhx`
 *         (keyrack), `aws` (sts, iam), and `npx` (declastruct plan)
 * .why  = each failure branch needs a keyrack, sts, or iam refusal on cue,
 *         which no live account gives deterministically; and the success
 *         path must never plan against a live account from a test
 * .real = `rhx aws.auth.demo.plan` against the demo account, run on each
 *         demo auth plan read (the route's case=2 records one)
 * .note = fakes on PATH, not module mocks: real bash runs the real skill
 */
const FAKE_COMMANDS: Record<string, string> = {
  rhx: [
    '#!/usr/bin/env bash',
    'case "$1 $2" in',
    '  "keyrack unlock")',
    '    [[ "${FAKE_UNLOCK:-ok}" == ok ]] || { echo "🔐 keyrack unlock refused" >&2; exit 2; }',
    '    exit 0 ;;',
    '  "keyrack source")',
    '    [[ -n "${FAKE_PROFILE:-}" ]] && echo "export AWS_PROFILE=$FAKE_PROFILE"',
    '    exit 0 ;;',
    'esac',
    'echo "fake rhx: unexpected call: $*" >&2; exit 99',
  ].join('\n'),
  // pins the full arg string of each call: a typo in the skill's --query
  // or --output flags falls through to exit 99, never to a green
  aws: [
    '#!/usr/bin/env bash',
    'case "$*" in',
    '  "sts get-caller-identity --query Arn --output text")',
    '    [[ "${FAKE_STS:-ok}" == ok ]] || exit 255',
    '    echo "arn:aws:sts::000000000000:assumed-role/${AWS_PROFILE}/session" ;;',
    '  "iam get-role --role-name ehmpathy-demo-for-grove --query Role.AssumeRolePolicyDocument.Statement[0].Principal.AWS --output text")',
    '    case "${FAKE_GETROLE:-ok}" in',
    '      ok) printf "%b\\n" "${FAKE_PRINCIPAL}" ;;',
    '      absent) echo "An error occurred (NoSuchEntity): role not found" >&2; exit 254 ;;',
    '      *) echo "An error occurred (AccessDenied): not authorized" >&2; exit 254 ;;',
    '    esac ;;',
    '  *) echo "fake aws: unexpected call: $*" >&2; exit 99 ;;',
    'esac',
  ].join('\n'),
  // records what it sees into $HOME/.npx.seen, apart from stdout, so a test
  // can prove what reached the plan while the snapshots hold only what the
  // caller sees; writes a canned plan at --into, so the tally has a file
  npx: [
    '#!/usr/bin/env bash',
    'echo "args: $*" >> "$HOME/.npx.seen"',
    'echo "sees: account=${GROVE_REACH_CAMP_ACCOUNT_ID:-} role=${GROVE_REACH_CAMP_ROLE_NAME:-} profile=${AWS_PROFILE:-} config=${AWS_CONFIG_FILE:-}" >> "$HOME/.npx.seen"',
    '[[ "${FAKE_PLAN:-ok}" == ok ]] || { echo "Error: GROVE_REACH_CAMP_ACCOUNT_ID is a placeholder" >&2; exit 1; }',
    // a stand-in for the per-resource lines real declastruct prints here
    'echo "(declastruct plan output)"',
    'into=""; prev=""',
    'for arg in "$@"; do [[ "$prev" == "--into" ]] && into="$arg"; prev="$arg"; done',
    'mkdir -p "$(dirname "$into")"',
    'case "${FAKE_PLAN_SHAPE:-gate}" in',
    ...Object.entries(PLAN_SHAPES).map(
      ([shape, body]) => `  ${shape}) printf '%s' '${body}' > "$into" ;;`,
    ),
    'esac',
  ].join('\n'),
};

/**
 * .what = a temp cwd with the fakes on PATH, and an optional demo .env
 * .why  = the skill reads `.env` relative to cwd; a temp cwd keeps an
 *         applier's real `.env` out of every case
 */
const genSkillScene = (input: {
  dotenv: string | null;
  git: boolean;
}): { cwd: string } => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'aws.auth.demo.plan-'));
  // the skill runs from the git root, so the scene is a repo unless a case
  // asks for the absent-repo refusal
  if (input.git) spawnSync('git', ['init', '-q'], { cwd });
  const bin = path.join(cwd, '.bin');
  fs.mkdirSync(bin);
  Object.entries(FAKE_COMMANDS).forEach(([name, body]) => {
    fs.writeFileSync(path.join(bin, name), `${body}\n`);
    fs.chmodSync(path.join(bin, name), 0o755);
  });
  if (input.dotenv !== null) {
    const dir = path.join(cwd, 'provision/aws.auth/account=demo');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.env'), input.dotenv);
  }
  return { cwd };
};

/**
 * .what = run the skill once in a scene, capture what the caller sees
 */
const runSkill = (input: {
  args: string[];
  env: Record<string, string>;
  dotenv: string | null;
  subdir?: string;
  git?: boolean;
}): {
  status: number | null;
  stdout: string;
  stderr: string;
  npxSeen: string | null;
} => {
  const scene = genSkillScene({
    dotenv: input.dotenv,
    git: input.git ?? true,
  });
  const cwdRun = input.subdir ? path.join(scene.cwd, input.subdir) : scene.cwd;
  fs.mkdirSync(cwdRun, { recursive: true });
  const result = spawnSync('bash', [SKILL_PATH, ...input.args], {
    cwd: cwdRun,
    env: {
      // the fakes first; then node, which the skill's plan tally runs on
      PATH: `${path.join(scene.cwd, '.bin')}:${path.dirname(process.execPath)}:/usr/bin:/bin`,
      HOME: scene.cwd,
      ...input.env,
    },
  });
  // what the fake npx recorded, if the skill reached the plan at all
  const npxSeenPath = path.join(scene.cwd, '.npx.seen');
  const npxSeen = fs.existsSync(npxSeenPath)
    ? fs.readFileSync(npxSeenPath, 'utf8')
    : null;
  fs.rmSync(scene.cwd, { recursive: true, force: true });
  return {
    status: result.status,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    npxSeen,
  };
};

// fixtures only; never a real identity (this repo is public)
const PRINCIPAL_FIXTURE =
  'arn:aws:iam::000000000000:role/example-camp-grove-role';
const ENV_OK = {
  FAKE_PROFILE: 'example.test.profile',
  FAKE_PRINCIPAL: PRINCIPAL_FIXTURE,
};
const DOTENV_FULL =
  'export GROVE_REACH_CAMP_ACCOUNT_ID=000000000000\nexport GROVE_REACH_CAMP_ROLE_NAME=example-camp-grove-role\n';

describe('aws.auth.demo.plan', () => {
  given('[case1] a caller who asks for help', () => {
    when('[t0] --help is passed', () => {
      then('it exits 0 and shows usage and the never-apply guarantee', () => {
        const result = runSkill({ args: ['--help'], env: {}, dotenv: null });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('rhx aws.auth.demo.plan');
        expect(result.stdout).toContain('never applies');
        expect(result.stdout).toContain('plan the demo auth resources, read-only');
        expect(result.stdout).toContain('reach pair: GROVE_REACH_CAMP_ACCOUNT_ID');
        expect(result.stdout).toContain('example');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] a caller whose args do not parse', () => {
    when('[t0] each bad call is run once', () => {
      // each exits 2 at the parse, before keyrack or aws is touched
      const variants = [
        {
          variant: 'unknown arg',
          args: ['--apply'],
          message: "✋ ConstraintError: unknown arg '--apply'",
        },
        {
          variant: 'a value flag last, with no value',
          args: ['--repo'],
          message: '✋ ConstraintError: --repo requires a value',
        },
        {
          variant: 'a value flag with a flag as its value',
          args: ['--repo', '--apply'],
          message: '✋ ConstraintError: --repo requires a value',
        },
      ];

      then('each exits 2 with its qualified header, and the text is snapped', () => {
        const captured = variants.map((each) => {
          const result = runSkill({ args: each.args, env: ENV_OK, dotenv: null });
          expect({ variant: each.variant, status: result.status }).toEqual({
            variant: each.variant,
            status: 2,
          });
          expect(result.stderr).toContain(each.message);
          expect(result.stderr).not.toContain('unbound variable');
          return { variant: each.variant, stderr: result.stderr };
        });
        expect(captured).toMatchSnapshot();
      });
    });
  });

  given('[case3] a caller whose creds or reach identity fail', () => {
    when('[t0] each failure is run once', () => {
      const variants = [
        {
          variant: 'keyrack unlock refused',
          env: { ...ENV_OK, FAKE_UNLOCK: 'refuse' },
          dotenv: null,
          status: 2,
          message: '✋ ConstraintError: keyrack unlock failed for env=test',
        },
        {
          variant: 'keyrack holds no AWS_PROFILE',
          env: { ...ENV_OK, FAKE_PROFILE: '' },
          dotenv: null,
          status: 2,
          message: '✋ ConstraintError: no AWS_PROFILE from keyrack for env=test',
        },
        {
          variant: 'creds do not authenticate',
          env: { ...ENV_OK, FAKE_STS: 'refuse' },
          dotenv: null,
          status: 2,
          message: '✋ ConstraintError: aws creds for env=test do not authenticate',
        },
        {
          variant: 'a .env with half the pair',
          env: ENV_OK,
          dotenv: 'export GROVE_REACH_CAMP_ACCOUNT_ID=000000000000\n',
          status: 2,
          message: '✋ ConstraintError: the .env sets only one of',
        },
        {
          variant: 'trust principal unreadable',
          env: { ...ENV_OK, FAKE_GETROLE: 'refuse' },
          dotenv: null,
          status: 1,
          message: "💥 MalfunctionError: could not read ehmpathy-demo-for-grove's trust principal",
        },
        {
          variant: 'reach role not yet created',
          env: { ...ENV_OK, FAKE_GETROLE: 'absent' },
          dotenv: null,
          status: 2,
          message: '✋ ConstraintError: ehmpathy-demo-for-grove does not exist yet',
        },
        {
          variant: 'trust principal is a bare unique id',
          env: { ...ENV_OK, FAKE_PRINCIPAL: 'AROAEXAMPLEUNIQUEID0' },
          dotenv: null,
          status: 2,
          message: "✋ ConstraintError: ehmpathy-demo-for-grove's trust principal is not one role arn",
        },
        {
          variant: 'trust principal is a tab-joined list',
          env: { ...ENV_OK, FAKE_PRINCIPAL: `${PRINCIPAL_FIXTURE}\\t${PRINCIPAL_FIXTURE}` },
          dotenv: null,
          status: 2,
          message: "✋ ConstraintError: ehmpathy-demo-for-grove's trust principal is not one role arn",
        },
        {
          variant: 'a shell with half the pair, beside a .env silent on it',
          env: { ...ENV_OK, GROVE_REACH_CAMP_ROLE_NAME: 'example-camp-grove-role' },
          dotenv: 'export UNRELATED=1\n',
          status: 2,
          message: '✋ ConstraintError: the shell sets only one of',
        },
        {
          variant: 'declastruct plan refuses a placeholder .env',
          env: { ...ENV_OK, FAKE_PLAN: 'refuse' },
          dotenv:
            'export GROVE_REACH_CAMP_ACCOUNT_ID=111111111111\nexport GROVE_REACH_CAMP_ROLE_NAME=example-camp-grove-role\n',
          status: 1,
          message: '💥 MalfunctionError: declastruct plan failed',
        },
        {
          variant: 'a .env with half the pair, beside a shell with the whole pair',
          env: {
            ...ENV_OK,
            GROVE_REACH_CAMP_ACCOUNT_ID: '000000000000',
            GROVE_REACH_CAMP_ROLE_NAME: 'example-camp-grove-role',
          },
          dotenv: 'export GROVE_REACH_CAMP_ROLE_NAME=example-camp-grove-role\n',
          status: 2,
          message: '✋ ConstraintError: the .env sets only one of',
        },
        {
          variant: 'run outside any git repo',
          env: ENV_OK,
          dotenv: null,
          git: false,
          status: 2,
          message: '✋ ConstraintError: not inside a git repo',
        },
        {
          variant: 'the plan file is not json',
          env: { ...ENV_OK, FAKE_PLAN_SHAPE: 'malformed' },
          dotenv: DOTENV_FULL,
          status: 1,
          message: '💥 MalfunctionError: could not tally the plan',
        },
      ];

      then('each exits with its class code and qualified header, and the text is snapped', () => {
        const captured = variants.map((each) => {
          const result = runSkill({
            args: [],
            env: each.env,
            dotenv: each.dotenv,
            git: 'git' in each ? each.git : true,
          });
          expect({ variant: each.variant, status: result.status }).toEqual({
            variant: each.variant,
            status: each.status,
          });
          expect(result.stderr).toContain(each.message);
          return { variant: each.variant, stderr: result.stderr };
        });
        expect(captured).toMatchSnapshot();
      });
    });
  });

  given('[case4] a caller whose creds and reach identity are found', () => {
    when('[t0] no .env and no shell pair', () => {
      then('it reads the pair off the live role, warns the principal is unchecked, and never applies', () => {
        const result = runSkill({ args: [], env: ENV_OK, dotenv: null });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('reach identity from: live role ehmpathy-demo-for-grove');
        expect(result.stdout).toContain('principal NOT checked');
        expect(result.stdout).toContain("principal NOT checked; the applier's own plan");
        expect(result.npxSeen).toContain('args: declastruct plan');
        expect(result.stdout).toContain('UPDATE: 1');
        expect(result.stdout).toContain('└─ DeclaredAwsIamRole.ehmpathy-demo-for-grove\n');
        expect(result.stdout).toContain('KEEP: 2');

        // the gate reads which field moved: the action, and the action alone
        expect(result.stdout).toContain('├─ - "action": "sts:AssumeRole",');
        expect(result.stdout).toContain('├─ +   "sts:TagSession",');
        expect(result.stdout).toContain('└─ + ],');
        expect(result.stdout).not.toMatch(/[-+]\s+"aws":/);
        expect(result.stdout).not.toContain('rows are not KEEP');
        expect(result.stdout).not.toContain('a trust principal moves');

        // never applies: declastruct is called once, to plan, and never to apply
        const npxCalls = (result.npxSeen ?? '')
          .split('\n')
          .filter((line) => line.startsWith('args: '));
        expect(npxCalls).toHaveLength(1);
        expect(npxCalls[0]).toMatch(/^args: declastruct plan /);
        expect(result.npxSeen).not.toContain('apply');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] a .env supplies the pair', () => {
      then('it reads the pair from .env, skips the live-role read, and does not warn', () => {
        const result = runSkill({
          args: [],
          env: { ...ENV_OK, FAKE_GETROLE: 'refuse' },
          dotenv: DOTENV_FULL,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('reach identity from: .env');
        expect(result.stdout).not.toContain('principal NOT checked');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] the shell exports the pair, with no .env', () => {
      then('it labels the source as the shell', () => {
        const result = runSkill({
          args: [],
          env: {
            ...ENV_OK,
            FAKE_GETROLE: 'refuse',
            GROVE_REACH_CAMP_ACCOUNT_ID: '000000000000',
            GROVE_REACH_CAMP_ROLE_NAME: 'example-camp-grove-role',
          },
          dotenv: null,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('reach identity from: shell');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] the shell holds an ambient AWS_PROFILE', () => {
      then('the plan runs as the keyrack profile, never the ambient one', () => {
        const result = runSkill({
          args: [],
          env: { ...ENV_OK, AWS_PROFILE: 'ambient.other.account' },
          dotenv: DOTENV_FULL,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('assumed-role/example.test.profile/');
        expect(result.npxSeen).toContain('profile=example.test.profile');
        expect(result.stdout).not.toContain('ambient.other.account');
        expect(result.npxSeen).not.toContain('ambient.other.account');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t4] the .env sets AWS_* and the skill own names beside the pair', () => {
      then('none of them reach the skill or the plan; only the pair does', () => {
        const result = runSkill({
          args: [],
          env: ENV_OK,
          dotenv: [
            'export AWS_PROFILE=dotenv.other.account',
            'export AWS_CONFIG_FILE=/tmp/dotenv.other.config',
            'export INTO=/tmp/dotenv.other.plan.json',
            DOTENV_FULL,
          ].join('\n'),
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('assumed-role/example.test.profile/');
        expect(result.npxSeen).toContain(
          'sees: account=000000000000 role=example-camp-grove-role profile=example.test.profile config=\n',
        );
        expect(result.npxSeen).toContain('--into provision/aws.auth/account=demo/.temp/plan.readonly.json');
        expect(result.npxSeen).not.toContain('dotenv.other');
        expect(result.stdout).not.toContain('dotenv.other');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t5] the .env holds bare KEY=value lines, no export', () => {
      then('the pair still reaches the plan', () => {
        const result = runSkill({
          args: [],
          env: { ...ENV_OK, FAKE_GETROLE: 'refuse' },
          dotenv:
            'GROVE_REACH_CAMP_ACCOUNT_ID=000000000000\nGROVE_REACH_CAMP_ROLE_NAME=example-camp-grove-role\n',
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('reach identity from: .env');
        expect(result.npxSeen).toContain(
          'sees: account=000000000000 role=example-camp-grove-role',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t6] the skill runs from a subdir of the repo', () => {
      then('it still finds the .env at the repo root', () => {
        const result = runSkill({
          args: [],
          env: { ...ENV_OK, FAKE_GETROLE: 'refuse' },
          dotenv: DOTENV_FULL,
          subdir: 'src/deep',
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('reach identity from: .env');
        expect(result.npxSeen).toContain('sees: account=000000000000');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t7] the shell exports the pair, and a .env is silent on it', () => {
      then('it labels the source by where the pair was found: the shell', () => {
        const result = runSkill({
          args: [],
          env: {
            ...ENV_OK,
            FAKE_GETROLE: 'refuse',
            GROVE_REACH_CAMP_ACCOUNT_ID: '000000000000',
            GROVE_REACH_CAMP_ROLE_NAME: 'example-camp-grove-role',
          },
          dotenv: 'export UNRELATED=1\n',
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('reach identity from: shell');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t8] rhx passes its --repo, --skill, --role through', () => {
      then('the skill accepts them and plans as usual', () => {
        const result = runSkill({
          args: ['--repo', '.this', '--role', 'any', '--skill', 'aws.auth.demo.plan'],
          env: { ...ENV_OK, FAKE_GETROLE: 'refuse' },
          dotenv: DOTENV_FULL,
        });
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('UPDATE: 1');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t9] the live role trusts a role under a path', () => {
      then('the pathed name reaches the plan unaltered', () => {
        const result = runSkill({
          args: [],
          env: {
            ...ENV_OK,
            FAKE_PRINCIPAL: 'arn:aws:iam::000000000000:role/svc/example-camp-grove-role',
          },
          dotenv: null,
        });
        expect(result.status).toEqual(0);
        expect(result.npxSeen).toContain(
          'sees: account=000000000000 role=svc/example-camp-grove-role ',
        );
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] a plan of each shape the tally must read', () => {
    when('[t0] each shape is planned once', () => {
      // the tally is the applier's gate: a STOP must read as a STOP, the
      // settled re-plan as all KEEP, and an empty plan as empty
      const shapes = [
        {
          shape: 'stop',
          dotenv: DOTENV_FULL,
          show: ['├─ CREATE: 2', '└─ UPDATE: 1', '⚠️ 3 rows are not KEEP'],
        },
        {
          // the same STOP, read with the pair off the live role: both warns
          shape: 'stop',
          dotenv: null,
          show: ['⚠️ 3 rows are not KEEP', '⚠️ principal NOT checked'],
        },
        {
          // a wrong .env pair: one UPDATE, as the gate expects, but the
          // principal moves too; the changed lines and the close both say so
          shape: 'drift',
          dotenv: DOTENV_FULL,
          show: [
            '-   "aws": "arn:aws:iam::000000000000:role/example-camp-grove-role",',
            '+   "aws": "arn:aws:iam::111111111111:role/example-wrong-role",',
            '⚠️ a trust principal moves',
          ],
        },
        {
          // an UPDATE row with no diff text: the row prints, bare
          shape: 'nodiff',
          dotenv: DOTENV_FULL,
          show: ['└─ UPDATE: 1', '└─ DeclaredAwsIamRole.ehmpathy-demo-for-grove\n'],
        },
        { shape: 'settled', dotenv: DOTENV_FULL, show: ['└─ KEEP: 2'] },
        { shape: 'empty', dotenv: DOTENV_FULL, show: ['└─ no changes in the plan'] },
      ];

      then('each tally names every row that is not KEEP, and is snapped', () => {
        const captured = shapes.map((each) => {
          const result = runSkill({
            args: [],
            env: { ...ENV_OK, FAKE_PLAN_SHAPE: each.shape },
            dotenv: each.dotenv,
          });
          expect({ shape: each.shape, status: result.status }).toEqual({
            shape: each.shape,
            status: 0,
          });
          each.show.forEach((line) => expect(result.stdout).toContain(line));
          const tally = result.stdout.slice(result.stdout.indexOf('🐚 plan tally'));
          return { shape: each.shape, tally };
        });
        expect(captured[0]?.tally).toContain(
          '   │  └─ DeclaredAwsIamRolePolicyAttachedInline.ehmpathy-demo-for-grove-extension.',
        );
        expect(captured[0]?.tally).toContain(
          '      └─ DeclaredAwsIamRole.ehmpathy-demo-oidc\n',
        );
        expect(captured.map((each) => each.tally).join('\n')).not.toMatch(
          /\.[0-9a-f]{32}\n/,
        );
        expect(captured).toMatchSnapshot();
      });
    });
  });
});
