import { keyrack } from 'rhachet/keyrack';

import {
  delEc2Instance,
  delEc2LaunchTemplate,
  getDeclastructAwsProvider,
} from '../../../src/contract/sdks';

const log = console;

/**
 * .what = prunes an EC2 instance + launch template pair from the demo account
 * .why = instances and templates are immutable; when their declared attributes
 *   change, the extant orphan blocks apply (upsert not supported) and blocks the
 *   acceptance suite. prune the orphan first, then a fresh apply recreates it clean.
 *
 * .usage = invoked via aws.prune.ec2.sh (unlocks keyrack + sources profile, then runs this)
 *   # demo infra defaults
 *   ./provision/aws.infra/account=demo/aws.prune.ec2.sh
 *
 *   # explicit target exids (e.g. stale acceptance fixtures)
 *   ./provision/aws.infra/account=demo/aws.prune.ec2.sh \
 *     --instance declastruct-acceptance-instance \
 *     --template declastruct-acceptance-template
 *
 * .note = delEc2Instance / delEc2LaunchTemplate are idempotent — a no-op if absent
 */
const prune = async () => {
  // source the demo profile from keyrack, exactly as the acceptance harness does
  // .note = lenient when aws creds already present (e.g. ci oidc or a sourced profile)
  const hasAwsCredentials = !!(
    process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE
  );
  keyrack.source({
    env: 'test',
    owner: 'ehmpath',
    mode: hasAwsCredentials ? 'lenient' : 'strict',
  });

  const provider = await getDeclastructAwsProvider({}, { log });
  const context = provider.context;

  // derive target exids from args, default to demo infra
  const args = process.argv.slice(2);
  const argAfter = (flag: string): string | null => {
    const at = args.indexOf(flag);
    if (at === -1) return null;
    return args[at + 1] ?? null;
  };
  const instanceExid = argAfter('--instance') ?? 'declastruct-demo-instance';
  const templateExid = argAfter('--template') ?? 'declastruct-demo-template';

  // prune the instance first (releases the template reference)
  log.info('prune instance...', { instanceExid });
  await delEc2Instance({ by: { unique: { exid: instanceExid } } }, context);

  // prune the template
  log.info('prune template...', { templateExid });
  await delEc2LaunchTemplate(
    { by: { unique: { exid: templateExid } } },
    context,
  );

  log.info('prune complete');
};

prune().catch(console.error);
