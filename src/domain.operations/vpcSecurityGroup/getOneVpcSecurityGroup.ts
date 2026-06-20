import { DescribeSecurityGroupsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsVpcSecurityGroup } from '@src/domain.objects/DeclaredAwsVpcSecurityGroup';
import { getOneVpcExid } from '@src/domain.operations/vpc/getOneVpcExid';

import { castIntoDeclaredAwsVpcSecurityGroup } from './castIntoDeclaredAwsVpcSecurityGroup';

/**
 * .what = gets a single VPC security group from AWS
 * .why = enables lookup by primary (id) or unique (exid tag)
 */
export const getOneVpcSecurityGroup = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsVpcSecurityGroup>;
        unique: RefByUnique<typeof DeclaredAwsVpcSecurityGroup>;
        ref: Ref<typeof DeclaredAwsVpcSecurityGroup>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcSecurityGroup> | null> => {
    // handle by ref via type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsVpcSecurityGroup })(input.by.ref))
        return getOneVpcSecurityGroup(
          { by: { unique: input.by.ref } },
          context,
        );
      if (isRefByPrimary({ of: DeclaredAwsVpcSecurityGroup })(input.by.ref))
        return getOneVpcSecurityGroup(
          { by: { primary: input.by.ref } },
          context,
        );
      UnexpectedCodePathError.throw('ref is neither unique nor primary', {
        input,
      });
    }

    // declare the client
    const ec2 = new EC2Client({
      region: context.aws.credentials.region,
    });

    // build filters based on lookup type
    const filters = (() => {
      if (input.by.primary)
        return [{ Name: 'group-id', Values: [input.by.primary.id] }];
      if (input.by.unique)
        return [{ Name: 'tag:exid', Values: [input.by.unique.exid] }];
      throw new UnexpectedCodePathError(
        'not referenced by primary nor unique. how not?',
        { input },
      );
    })();

    // execute the describe command
    const describeCommand = new DescribeSecurityGroupsCommand({
      Filters: filters,
    });

    try {
      const response = await ec2.send(describeCommand);

      // return null if no security groups found
      if (!response.SecurityGroups || response.SecurityGroups.length === 0)
        return null;

      const sg = response.SecurityGroups[0]!;

      // lookup VPC exid from id
      if (!sg.VpcId)
        UnexpectedCodePathError.throw('security group lacks vpc id', { sg });
      const vpcExid = await getOneVpcExid({ vpcId: sg.VpcId }, context);

      // cast and return
      return castIntoDeclaredAwsVpcSecurityGroup(sg, vpcExid);
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle security group not found
      if (error.name === 'InvalidGroup.NotFound') return null;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      if (metadata?.httpStatusCode === 404) return null;

      throw new HelpfulError('aws.getOneVpcSecurityGroup error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          httpStatusCode: metadata?.httpStatusCode,
          input,
        },
      });
    }
  },
);
