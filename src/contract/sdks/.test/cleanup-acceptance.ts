import {
  delEc2Instance,
  delEc2LaunchTemplate,
  getDeclastructAwsProvider,
} from '../../../sdks';

const log = console;

/**
 * .what = cleanup old EC2 acceptance test resources before re-provision
 * .why = launch templates are immutable; must delete before recreate with new properties
 */
const cleanup = async () => {
  const provider = await getDeclastructAwsProvider({}, { log });
  const context = provider.context;

  // delete old instance first (releases template reference)
  log.info('delete old instance...');
  await delEc2Instance(
    { by: { unique: { exid: 'declastruct-acceptance-instance' } } },
    context,
  );

  // delete old template
  log.info('delete old template...');
  await delEc2LaunchTemplate(
    { by: { unique: { exid: 'declastruct-acceptance-template' } } },
    context,
  );

  log.info('cleanup complete');
};

cleanup().catch(console.error);
