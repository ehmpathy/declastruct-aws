import type { Instance } from '@aws-sdk/client-ec2';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

/**
 * .what = casts an AWS SDK Instance to a DeclaredAwsEc2Instance
 * .why = maps AWS response shape to domain object
 *
 * @param input.instance - the AWS SDK Instance response
 * @param input.subnetExid - the exid of the subnet (resolved by caller)
 * @param input.securityGroupExids - the exids of the security groups (resolved by caller)
 * @param input.templateExid - the exid of the launch template (resolved by caller, null if none)
 */
export const castIntoDeclaredAwsEc2Instance = (input: {
  instance: Instance;
  subnetExid: string;
  securityGroupExids: string[];
  templateExid: string | null;
}): HasReadonly<typeof DeclaredAwsEc2Instance> => {
  // extract exid from tags
  const exidTag = input.instance.Tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'ec2 instance lacks exid tag; cannot cast to domain object',
      { input },
    );

  // extract tags (exclude system tags and internal metadata tags)
  const tags = (input.instance.Tags ?? [])
    .filter(
      (tag) =>
        tag.Key &&
        !tag.Key.startsWith('aws:') &&
        tag.Key !== 'exid' &&
        tag.Key !== 'templateExid' &&
        tag.Key !== 'publicIpEnabled',
    )
    .reduce(
      (acc, tag) => {
        if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
        return acc;
      },
      {} as Record<string, string>,
    );

  // determine publicIpEnabled, preferring the LIVE value as the source of truth.
  // note: a public ip is only readable while the instance is RUNNING — AWS releases an
  //   auto-assigned public ip when the instance stops. so:
  //   - running     -> read the live PublicIpAddress directly. this is authoritative:
  //                    an out-of-band edit surfaces as real drift, so setEc2Instance can
  //                    fail loud (immutable) or re-apply to regain control — never masked
  //                    by a stale tag (see rule.require.immutable-source-of-truth).
  //   - not running -> the live value is unreadable, so fall back to the `publicIpEnabled`
  //                    intent tag recorded by setEc2Instance at create time; it stays
  //                    stable across stop/start so plan/apply converge to KEEP. legacy
  //                    instances lacking the tag fall back to the (absent) live value.
  const isRunning = input.instance.State?.Name === 'running';
  const publicIpTag = input.instance.Tags?.find(
    (tag) => tag.Key === 'publicIpEnabled',
  );
  const publicIpEnabled = isRunning
    ? !!input.instance.PublicIpAddress
    : publicIpTag?.Value !== undefined
      ? publicIpTag.Value === 'true'
      : !!input.instance.PublicIpAddress;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsEc2Instance.as({
      id: input.instance.InstanceId,
      exid: exidTag.Value,
      template: input.templateExid ? { exid: input.templateExid } : null,
      network: {
        subnet: { exid: input.subnetExid },
        security: {
          groups: input.securityGroupExids.map((exid) => ({ exid })),
        },
        interface: {
          publicIpEnabled,
          // aws defaults source/dest check to true when absent
          sourceDestChecked: input.instance.SourceDestCheck ?? true,
          // resolved nic ip addresses (@readonly)
          // note: publicIp is null when no public ip was assigned (not absent)
          privateIp: input.instance.PrivateIpAddress,
          publicIp: input.instance.PublicIpAddress ?? null,
        },
      },
      tags: Object.keys(tags).length > 0 ? tags : null,
    }),
    hasReadonly({ of: DeclaredAwsEc2Instance }),
  );
};
