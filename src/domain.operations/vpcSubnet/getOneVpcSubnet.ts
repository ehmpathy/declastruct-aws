import { DescribeSubnetsCommand, EC2Client } from '@aws-sdk/client-ec2';
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
import { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';
import { getOneVpcExid } from '@src/domain.operations/vpc/getOneVpcExid';

import { castIntoDeclaredAwsVpcSubnet } from './castIntoDeclaredAwsVpcSubnet';

/**
 * .what = gets a single VPC subnet from AWS
 * .why = enables lookup by primary (id) or unique (exid tag)
 */
export const getOneVpcSubnet = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsVpcSubnet>;
        unique: RefByUnique<typeof DeclaredAwsVpcSubnet>;
        ref: Ref<typeof DeclaredAwsVpcSubnet>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcSubnet> | null> => {
    // handle by ref via type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsVpcSubnet })(input.by.ref))
        return getOneVpcSubnet({ by: { unique: input.by.ref } }, context);
      if (isRefByPrimary({ of: DeclaredAwsVpcSubnet })(input.by.ref))
        return getOneVpcSubnet({ by: { primary: input.by.ref } }, context);
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
        return [{ Name: 'subnet-id', Values: [input.by.primary.id] }];
      if (input.by.unique)
        return [{ Name: 'tag:exid', Values: [input.by.unique.exid] }];
      throw new UnexpectedCodePathError(
        'not referenced by primary nor unique. how not?',
        { input },
      );
    })();

    // execute the describe command
    const describeCommand = new DescribeSubnetsCommand({ Filters: filters });

    try {
      const response = await ec2.send(describeCommand);

      // return null if no subnets found
      if (!response.Subnets || response.Subnets.length === 0) return null;

      const subnet = response.Subnets[0]!;

      // lookup VPC exid from id
      if (!subnet.VpcId)
        UnexpectedCodePathError.throw('subnet lacks vpc id', { subnet });
      const vpcExid = await getOneVpcExid({ vpcId: subnet.VpcId }, context);

      // cast and return
      return castIntoDeclaredAwsVpcSubnet(subnet, vpcExid);
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle subnet not found
      if (error.name === 'InvalidSubnetID.NotFound') return null;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      if (metadata?.httpStatusCode === 404) return null;

      throw new HelpfulError('aws.getOneVpcSubnet error', {
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
