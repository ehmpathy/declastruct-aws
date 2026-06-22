import { EC2Client, RunInstancesCommand } from '@aws-sdk/client-ec2';
import { sleep } from '@ehmpathy/uni-time';
import { type HasReadonly, isRefByPrimary, type Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
import type { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';
import { DeclaredAwsVpcSecurityGroup } from '@src/domain.objects/DeclaredAwsVpcSecurityGroup';
import { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';

import { getEc2LaunchTemplate } from '../ec2LaunchTemplate/getEc2LaunchTemplate';
import { getOneVpcSecurityGroup } from '../vpcSecurityGroup/getOneVpcSecurityGroup';
import { getOneVpcSubnet } from '../vpcSubnet/getOneVpcSubnet';
import { getEc2Instance } from './getEc2Instance';

/**
 * .what = sets an EC2 instance in AWS
 * .why = enables declarative control of EC2 instance creation from launch template
 */
export const setEc2Instance = async (
  input: PickOne<{
    findsert: DeclaredAwsEc2Instance;
    upsert: DeclaredAwsEc2Instance;
  }>,
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsEc2Instance>> => {
  // create ec2 client
  const ec2 = new EC2Client({ region: context.aws.credentials.region });

  // get the instance to set
  const instance = input.findsert ?? input.upsert;
  if (!instance)
    UnexpectedCodePathError.throw('either findsert or upsert required', {
      input,
    });

  // check if instance already exists
  const instanceFound = await getEc2Instance(
    { by: { unique: { exid: instance.exid } } },
    context,
  );

  // if findsert and found, return extant
  if (input.findsert && instanceFound) return instanceFound;

  // if upsert and found, EC2 instances cannot be updated in place
  // .note = EC2 instances are immutable — must terminate and recreate for changes
  if (input.upsert && instanceFound)
    return UnexpectedCodePathError.throw(
      'EC2 instance upsert not supported — instances are immutable; terminate and recreate for changes',
      { instance, instanceFound },
    );

  // lookup launch template from ref
  const launchTemplate = await (async (): Promise<{
    id: string;
    exid: string;
  } | null> => {
    // template=null means backwards compat with extant instances
    // (instances created outside declastruct, or before template support)
    // we cannot create new instances without a template because AMI and instance type are required
    if (!instance.template) return null;

    // look up template to get both id and exid
    const template = await getEc2LaunchTemplate(
      {
        by: {
          ref: instance.template as Ref<typeof DeclaredAwsEc2LaunchTemplate>,
        },
      },
      context,
    );

    if (!template)
      return UnexpectedCodePathError.throw(
        'launch template not found; cannot create instance',
        { templateRef: instance.template },
      );

    return { id: template.id, exid: template.exid };
  })();

  // if no template, instance must already be extant (backwards compat)
  // cannot create new instances without template (need AMI and instance type)
  if (!launchTemplate)
    return UnexpectedCodePathError.throw(
      'cannot create instance without template — template provides required AMI and instance type; for extant instances, ensure exid tag is set',
      { instance },
    );

  // lookup subnet id from ref
  const subnetId = await (async (): Promise<string> => {
    // if ref has id, use it directly
    if (isRefByPrimary({ of: DeclaredAwsVpcSubnet })(instance.subnet))
      return instance.subnet.id;

    // otherwise, look up subnet by unique key
    const subnet = await getOneVpcSubnet(
      { by: { ref: instance.subnet as Ref<typeof DeclaredAwsVpcSubnet> } },
      context,
    );

    if (!subnet)
      return UnexpectedCodePathError.throw(
        'subnet not found; cannot create instance',
        { subnetRef: instance.subnet },
      );

    return subnet.id;
  })();

  // lookup security group ids from refs
  const securityGroupIds = await Promise.all(
    instance.securityGroups.map(async (sgRef) => {
      // if ref has id, use it directly
      if (isRefByPrimary({ of: DeclaredAwsVpcSecurityGroup })(sgRef))
        return sgRef.id;

      // otherwise, look up security group by unique key
      const sg = await getOneVpcSecurityGroup(
        { by: { ref: sgRef as Ref<typeof DeclaredAwsVpcSecurityGroup> } },
        context,
      );

      if (!sg)
        return UnexpectedCodePathError.throw(
          'security group not found; cannot create instance',
          { securityGroupRef: sgRef },
        );

      return sg.id;
    }),
  );

  // build tags for the instance (include templateExid for idempotency)
  const instanceTags = [
    { Key: 'exid', Value: instance.exid },
    { Key: 'templateExid', Value: launchTemplate.exid },
    ...(instance.tags
      ? Object.entries(instance.tags).map(([Key, Value]) => ({ Key, Value }))
      : []),
  ];

  // create new instance from launch template
  const response = await ec2.send(
    new RunInstancesCommand({
      MinCount: 1,
      MaxCount: 1,
      LaunchTemplate: {
        LaunchTemplateId: launchTemplate.id,
        Version: '$Latest',
      },
      SubnetId: subnetId,
      SecurityGroupIds: securityGroupIds,
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: instanceTags,
        },
      ],
    }),
  );

  // extract created instance id
  const [createdInstance] = response.Instances ?? [];
  const instanceId = createdInstance?.InstanceId;
  if (!instanceId)
    return UnexpectedCodePathError.throw(
      'EC2 RunInstances did not return an instance id',
      { response, instance },
    );

  // get the created instance to return full domain object
  // note: retry with backoff due to AWS eventual consistency
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const created = await getEc2Instance(
      { by: { primary: { id: instanceId } } },
      context,
    );

    if (created) return created;

    // wait before retry (exponential backoff: 500ms, 1s, 2s, 4s)
    if (attempt < maxAttempts) await sleep(500 * Math.pow(2, attempt - 1));
  }

  return UnexpectedCodePathError.throw(
    'could not find newly created EC2 instance after retries',
    { instanceId, instance, maxAttempts },
  );
};
