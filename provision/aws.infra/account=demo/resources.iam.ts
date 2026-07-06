import { type DomainEntity, RefByPrimary, RefByUnique } from 'domain-objects';

import {
  DeclaredAwsIamInstanceProfile,
  type DeclaredAwsIamPolicy,
  DeclaredAwsIamRole,
  DeclaredAwsIamRolePolicyAttachedInline,
  DeclaredAwsIamRolePolicyAttachedManaged,
} from '../../../src/contract/sdks';

/**
 * .what = IAM for the demo EC2 instances (NAT + SSH box)
 * .why = the SSM agent needs AmazonSSMManagedInstanceCore, and the box needs to
 *        hibernate itself when idle (StopInstances with Hibernate on its own tag)
 */
export const getResourcesOfIam = (): DomainEntity<any>[] => {
  // role assumed by the demo EC2 instances
  const ec2Role = DeclaredAwsIamRole.as({
    name: 'declastruct-demo-ec2-role',
    path: '/',
    description:
      'Role for declastruct demo EC2 instances (SSM + self-hibernate)',
    policies: [
      {
        effect: 'Allow',
        principal: { service: 'ec2.amazonaws.com' },
        action: 'sts:AssumeRole',
      },
    ],
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // AWS managed SSM policy — lets the SSM agent register (enables SSM tunnel)
  const ec2RoleSsmPolicy = DeclaredAwsIamRolePolicyAttachedManaged.as({
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(ec2Role),
    policy: RefByPrimary.as<typeof DeclaredAwsIamPolicy>({
      arn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
    }),
  });

  // inline policy — lets the box hibernate ITSELF when idle
  // note: scoped to declastruct-managed instances only, so the box cannot stop
  //       arbitrary instances
  const ec2RoleHibernatePolicy = DeclaredAwsIamRolePolicyAttachedInline.as({
    name: 'self-hibernate',
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(ec2Role),
    document: {
      statements: [
        {
          effect: 'Allow',
          action: ['ec2:StopInstances'],
          resource: '*',
          condition: {
            StringEquals: { 'ec2:ResourceTag/managedBy': 'declastruct' },
          },
        },
      ],
    },
  });

  // instance profile that carries the role onto the instances
  const ec2InstanceProfile = DeclaredAwsIamInstanceProfile.as({
    name: 'declastruct-demo-ec2-profile',
    role: RefByUnique.as<typeof DeclaredAwsIamRole>(ec2Role),
    path: '/',
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  return [
    ec2Role,
    ec2RoleSsmPolicy,
    ec2RoleHibernatePolicy,
    ec2InstanceProfile,
  ];
};
