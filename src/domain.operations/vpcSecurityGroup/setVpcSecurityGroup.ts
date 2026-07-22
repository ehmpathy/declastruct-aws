import {
  AuthorizeSecurityGroupEgressCommand,
  AuthorizeSecurityGroupIngressCommand,
  CreateSecurityGroupCommand,
  CreateTagsCommand,
  EC2Client,
  RevokeSecurityGroupEgressCommand,
  RevokeSecurityGroupIngressCommand,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcSecurityGroup } from '@src/domain.objects/DeclaredAwsVpcSecurityGroup';
import { getOneVpcId } from '@src/domain.operations/vpc/getOneVpcId';
import { tolerateExtantConflict } from '@src/infra/idempotency/tolerateExtantConflict';

import { asAwsIpPermission } from './asAwsIpPermission';
import { getOneVpcSecurityGroup } from './getOneVpcSecurityGroup';

/**
 * .what = creates or updates a VPC security group
 * .why = enables declarative security group management with rules and tags
 *
 * .note
 *   - findsert: creates if not found, returns foundBefore if found
 *   - upsert: creates if not found, syncs rules if found
 *   - name and VPC cannot be changed after creation (AWS limitation)
 */
export const setVpcSecurityGroup = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsVpcSecurityGroup;
      upsert: DeclaredAwsVpcSecurityGroup;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcSecurityGroup>> => {
    const sgDesired = input.findsert ?? input.upsert;

    // create client
    const ec2 = new EC2Client({
      region: context.aws.credentials.region,
    });

    // check if security group already exists
    const foundBefore = await getOneVpcSecurityGroup(
      { by: { unique: { exid: sgDesired.exid } } },
      context,
    );

    // handle findsert: if found, return it
    if (foundBefore && input.findsert) return foundBefore;

    // create security group if not found, otherwise use extant id
    const sgId = await (async (): Promise<string> => {
      if (foundBefore) return foundBefore.id;

      // lookup VPC id from ref
      const vpcId = await getOneVpcId({ vpc: sgDesired.vpc }, context);

      const createResponse = await ec2.send(
        new CreateSecurityGroupCommand({
          GroupName: sgDesired.name,
          Description: sgDesired.description,
          VpcId: vpcId,
          TagSpecifications: [
            {
              ResourceType: 'security-group',
              Tags: [
                { Key: 'exid', Value: sgDesired.exid },
                ...(sgDesired.tags
                  ? Object.entries(sgDesired.tags).map(([key, value]) => ({
                      Key: key,
                      Value: value,
                    }))
                  : []),
              ],
            },
          ],
        }),
      );

      // failfast if security group id is absent
      if (!createResponse.GroupId)
        return UnexpectedCodePathError.throw(
          'security group lacks id after create',
          { createResponse },
        );

      const newSgId = createResponse.GroupId;

      // revoke default egress rule (AWS creates allow-all egress by default)
      await ec2.send(
        new RevokeSecurityGroupEgressCommand({
          GroupId: newSgId,
          IpPermissions: [
            {
              IpProtocol: '-1',
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            },
          ],
        }),
      );

      return newSgId;
    })();

    // update tags if upsert on extant
    if (foundBefore && input.upsert && sgDesired.tags) {
      await ec2.send(
        new CreateTagsCommand({
          Resources: [sgId],
          Tags: Object.entries(sgDesired.tags).map(([key, value]) => ({
            Key: key,
            Value: value,
          })),
        }),
      );
    }

    // sync rules (for new or upsert)
    const shouldSyncRules = !foundBefore || input.upsert;

    if (shouldSyncRules) {
      // revoke all current rules if upsert (to sync to desired state)
      if (foundBefore && input.upsert) {
        if (foundBefore.rules.ingress.length > 0) {
          await ec2.send(
            new RevokeSecurityGroupIngressCommand({
              GroupId: sgId,
              IpPermissions: foundBefore.rules.ingress.map(asAwsIpPermission),
            }),
          );
        }
        if (foundBefore.rules.egress.length > 0) {
          await ec2.send(
            new RevokeSecurityGroupEgressCommand({
              GroupId: sgId,
              IpPermissions: foundBefore.rules.egress.map(asAwsIpPermission),
            }),
          );
        }
      }

      // add desired rules; pre-extant identical rules count as idempotent success
      if (sgDesired.rules.ingress.length > 0) {
        await tolerateExtantConflict(
          { tolerate: ['InvalidPermission.Duplicate'] },
          () =>
            ec2.send(
              new AuthorizeSecurityGroupIngressCommand({
                GroupId: sgId,
                IpPermissions: sgDesired.rules.ingress.map(asAwsIpPermission),
              }),
            ),
        );
      }
      if (sgDesired.rules.egress.length > 0) {
        await tolerateExtantConflict(
          { tolerate: ['InvalidPermission.Duplicate'] },
          () =>
            ec2.send(
              new AuthorizeSecurityGroupEgressCommand({
                GroupId: sgId,
                IpPermissions: sgDesired.rules.egress.map(asAwsIpPermission),
              }),
            ),
        );
      }
    }

    // fetch and return the security group
    const foundAfter = await getOneVpcSecurityGroup(
      { by: { unique: { exid: sgDesired.exid } } },
      context,
    );

    // failfast if not found after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('security group not found after set', {
        sgDesired,
      });

    return foundAfter;
  },
);
