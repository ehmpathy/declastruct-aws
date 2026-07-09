import {
  EC2Client,
  ModifyInstanceAttributeCommand,
  RunInstancesCommand,
} from '@aws-sdk/client-ec2';
import { sleep } from '@ehmpathy/uni-time';
import { type HasReadonly, isRefByPrimary, type Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
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
import { getEc2InstanceImmutableDrift } from './getEc2InstanceImmutableDrift';

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

  // if upsert and found, reconcile the mutable attributes in place. an EC2 instance is
  // immutable in most attributes (template, subnet, security groups, public-ip
  // association) — those require a terminate + recreate. but sourceDestCheck IS mutable
  // (ModifyInstanceAttribute changes it on a live instance), so a drift on it must
  // converge in place rather than dead-end the apply — see rule.require.guaranteed-idempotency.
  if (input.upsert && instanceFound) {
    // fail loud only when a truly-immutable attribute differs (recreate required)
    const immutableDrift = getEc2InstanceImmutableDrift({
      found: instanceFound,
      desired: instance,
    });
    if (immutableDrift.length)
      return UnexpectedCodePathError.throw(
        'EC2 instance upsert not supported for immutable attributes; terminate and recreate for changes',
        { instance, instanceFound, immutableDrift },
      );

    // failfast if the extant instance lacks an id (cannot reconcile without it)
    if (!instanceFound.id)
      UnexpectedCodePathError.throw(
        'extant EC2 instance lacks an id; cannot reconcile',
        { instanceFound },
      );

    // reconcile the mutable source/dest check in place if it drifted
    if (
      instanceFound.network.interface.sourceDestChecked !==
      instance.network.interface.sourceDestChecked
    )
      await ec2.send(
        new ModifyInstanceAttributeCommand({
          InstanceId: instanceFound.id,
          SourceDestCheck: {
            Value: instance.network.interface.sourceDestChecked,
          },
        }),
      );

    // re-get and return the reconciled instance so the plan converges to KEEP
    const reconciled = await getEc2Instance(
      { by: { primary: { id: instanceFound.id } } },
      context,
    );
    if (!reconciled)
      return UnexpectedCodePathError.throw(
        'reconciled EC2 instance not found after modify',
        { instanceFound },
      );
    return reconciled;
  }

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
    if (isRefByPrimary({ of: DeclaredAwsVpcSubnet })(instance.network.subnet))
      return instance.network.subnet.id;

    // otherwise, look up subnet by unique key
    const subnet = await getOneVpcSubnet(
      {
        by: {
          ref: instance.network.subnet as Ref<typeof DeclaredAwsVpcSubnet>,
        },
      },
      context,
    );

    if (!subnet)
      return UnexpectedCodePathError.throw(
        'subnet not found; cannot create instance',
        { subnetRef: instance.network.subnet },
      );

    return subnet.id;
  })();

  // lookup security group ids from refs
  const securityGroupIds = await Promise.all(
    instance.network.security.groups.map(async (sgRef) => {
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

  // determine placement params
  // note: when a public ip is desired, AWS requires NetworkInterfaces (which
  //       carries AssociatePublicIpAddress) instead of top-level SubnetId /
  //       SecurityGroupIds — the two forms cannot be mixed
  const placement = instance.network.interface.publicIpEnabled
    ? {
        NetworkInterfaces: [
          {
            DeviceIndex: 0,
            SubnetId: subnetId,
            Groups: securityGroupIds,
            AssociatePublicIpAddress: true,
          },
        ],
      }
    : {
        SubnetId: subnetId,
        SecurityGroupIds: securityGroupIds,
      };

  // create new instance from launch template
  const response = await ec2.send(
    new RunInstancesCommand({
      MinCount: 1,
      MaxCount: 1,
      LaunchTemplate: {
        LaunchTemplateId: launchTemplate.id,
        Version: '$Latest',
      },
      ...placement,
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

  // disable the source/dest check when requested (required so a nat can forward)
  // note: aws default is true; only modify when the declared value is false
  if (!instance.network.interface.sourceDestChecked)
    await ec2.send(
      new ModifyInstanceAttributeCommand({
        InstanceId: instanceId,
        SourceDestCheck: { Value: false },
      }),
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
    if (attempt < maxAttempts) await sleep(500 * 2 ** (attempt - 1));
  }

  return UnexpectedCodePathError.throw(
    'could not find newly created EC2 instance after retries',
    { instanceId, instance, maxAttempts },
  );
};
