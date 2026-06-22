import type { DomainEntity } from 'domain-objects';

import {
  DeclaredAwsEc2Instance,
  DeclaredAwsEc2InstanceSession,
  DeclaredAwsEc2LaunchTemplate,
} from '../../../src/contract/sdks';

/**
 * .what = EC2 infrastructure with hibernation support for demo account
 * .why = dogfood EC2 + launch template + hibernation to verify declastruct works
 */
export const getResourcesOfEc2 = (): DomainEntity<any>[] => {
  // launch template with hibernation enabled
  const launchTemplate = DeclaredAwsEc2LaunchTemplate.as({
    exid: 'declastruct-demo-template',
    instanceType: 't3.micro', // free tier eligible
    imageId: 'ami-0c02fb55956c7d316', // Amazon Linux 2 (us-east-1)
    hibernation: true,
    rootVolumeSize: 8, // minimum for Amazon Linux 2
    rootVolumeEncrypted: true, // required for hibernation
    iamInstanceProfile: null,
    userData: `#!/bin/bash
# auto-shutdown after 5 minutes to minimize cost
shutdown -h +5
`,
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // EC2 instance via the template
  const instance = DeclaredAwsEc2Instance.as({
    exid: 'declastruct-demo-instance',
    template: { exid: launchTemplate.exid },
    subnet: { exid: 'declastruct-demo-subnet-1a' },
    securityGroups: [{ exid: 'declastruct-demo-sg' }],
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // instance session to control lifecycle (active/hibernated)
  const session = DeclaredAwsEc2InstanceSession.as({
    instance: { exid: instance.exid },
    status: 'active', // start as active; change to 'hibernated' to hibernate
  });

  return [launchTemplate, instance, session];
};
