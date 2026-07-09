import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

import { getEc2InstanceImmutableDrift } from './getEc2InstanceImmutableDrift';

/**
 * .what = builds a DeclaredAwsEc2Instance with sensible defaults for drift tests
 * .why = keeps each case focused on the one attribute under test
 */
const genInstance = (
  overrides: {
    templateExid?: string | null;
    subnetExid?: string;
    groupExids?: string[];
    publicIpEnabled?: boolean;
    sourceDestChecked?: boolean;
  } = {},
): DeclaredAwsEc2Instance =>
  DeclaredAwsEc2Instance.as({
    exid: 'declastruct-acceptance-nat',
    template:
      overrides.templateExid === null
        ? null
        : {
            exid:
              overrides.templateExid ?? 'declastruct-acceptance-nat-template',
          },
    network: {
      subnet: { exid: overrides.subnetExid ?? 'subnet-public-1a' },
      security: {
        groups: (overrides.groupExids ?? ['sg-a']).map((exid) => ({ exid })),
      },
      interface: {
        publicIpEnabled: overrides.publicIpEnabled ?? true,
        sourceDestChecked: overrides.sourceDestChecked ?? false,
      },
    },
    tags: null,
  });

describe('getEc2InstanceImmutableDrift', () => {
  const TEST_CASES: Array<{
    description: string;
    found: DeclaredAwsEc2Instance;
    desired: DeclaredAwsEc2Instance;
    expected: string[];
  }> = [
    {
      description: '[case1] identical instances have no immutable drift',
      found: genInstance(),
      desired: genInstance(),
      expected: [],
    },
    {
      description:
        '[case2] a sourceDestChecked-only diff is NOT immutable drift (it is reconcilable)',
      found: genInstance({ sourceDestChecked: true }),
      desired: genInstance({ sourceDestChecked: false }),
      expected: [],
    },
    {
      description: '[case3] a template swap is immutable drift',
      found: genInstance({ templateExid: 'template-old' }),
      desired: genInstance({ templateExid: 'template-new' }),
      expected: ['template'],
    },
    {
      description: '[case4] a subnet change is immutable drift',
      found: genInstance({ subnetExid: 'subnet-a' }),
      desired: genInstance({ subnetExid: 'subnet-b' }),
      expected: ['network.subnet'],
    },
    {
      description: '[case5] a security-group change is immutable drift',
      found: genInstance({ groupExids: ['sg-a'] }),
      desired: genInstance({ groupExids: ['sg-b'] }),
      expected: ['network.security.groups'],
    },
    {
      description:
        '[case6] security groups compare as a set (order does not matter)',
      found: genInstance({ groupExids: ['sg-a', 'sg-b'] }),
      desired: genInstance({ groupExids: ['sg-b', 'sg-a'] }),
      expected: [],
    },
    {
      description: '[case7] a public-ip association change is immutable drift',
      found: genInstance({ publicIpEnabled: false }),
      desired: genInstance({ publicIpEnabled: true }),
      expected: ['network.interface.publicIpEnabled'],
    },
    {
      description:
        '[case8] multiple immutable diffs are all reported, mutable ones excluded',
      found: genInstance({
        subnetExid: 'subnet-a',
        publicIpEnabled: false,
        sourceDestChecked: true,
      }),
      desired: genInstance({
        subnetExid: 'subnet-b',
        publicIpEnabled: true,
        sourceDestChecked: false,
      }),
      expected: ['network.subnet', 'network.interface.publicIpEnabled'],
    },
  ];

  TEST_CASES.forEach((testCase) => {
    test(testCase.description, () => {
      const drift = getEc2InstanceImmutableDrift({
        found: testCase.found,
        desired: testCase.desired,
      });
      expect(drift).toEqual(testCase.expected);
    });
  });
});
