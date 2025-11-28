import {
  DeclaredAwsVpcTunnel,
  getDeclastructAwsProvider,
} from '../../../../../dist/contract/sdks';

/**
 * .what = provider configuration for AWS acceptance tests
 * .why = enables declastruct CLI to interact with AWS API
 * .note = requires AWS_PROFILE to be set via: source .agent/repo=.this/skills/use.dev.awsprofile.sh
 */
export const getProviders = async () => [
  await getDeclastructAwsProvider(
    {},
    {
      log: {
        info: () => {},
        debug: () => {},
        warn: console.warn,
        error: console.error,
      },
    },
  ),
];

/**
 * .what = resource declarations for AWS acceptance tests
 * .why = defines desired state of VPC tunnel for testing
 */
export const getResources = async () => {
  // declare tunnel to open
  const tunnel = DeclaredAwsVpcTunnel.as({
    via: {
      mechanism: 'aws.ssm',
      bastion: { exid: 'vpc-main-bastion' },
    },
    into: {
      cluster: { name: 'ahbodedb' },
    },
    from: {
      host: 'localhost',
      port: 3_5432,
    },
    status: 'OPEN',
  });

  return [tunnel];
};
