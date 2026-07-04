import {
  delEc2Instance,
  delEc2LaunchTemplate,
  delVpcSubnet,
  getDeclastructAwsProvider,
} from '../../../../src/contract/sdks';

const log = console;

/**
 * .what = cleanup acceptance test EC2 resources
 * .why = launch templates are immutable; must delete before recreate with new properties
 * .note = also deletes old subnet to allow CIDR reuse with new subnet names
 */
const cleanup = async () => {
  const provider = await getDeclastructAwsProvider({}, { log });
  const context = provider.context;

  // delete old instance first (releases template reference)
  log.info('delete old instance: declastruct-acceptance-instance');
  await delEc2Instance(
    { by: { unique: { exid: 'declastruct-acceptance-instance' } } },
    context,
  );

  // delete old template
  log.info('delete old template: declastruct-acceptance-template');
  await delEc2LaunchTemplate(
    { by: { unique: { exid: 'declastruct-acceptance-template' } } },
    context,
  );

  // delete old subnet (releases CIDR for new subnet)
  log.info('delete old subnet: declastruct-acceptance-subnet-1a');
  await delVpcSubnet(
    { ref: { exid: 'declastruct-acceptance-subnet-1a' } },
    context,
  );

  log.info('cleanup complete');
};

cleanup().catch((err) => {
  console.error(err);
  process.exit(1);
});
