import {
  DescribeVpcAttributeCommand,
  DescribeVpcsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
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
import { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';

import { castIntoDeclaredAwsVpc } from './castIntoDeclaredAwsVpc';

/**
 * .what = gets a single VPC from AWS
 * .why = enables lookup by primary (id) or unique (exid tag)
 */
export const getOneVpc = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsVpc>;
        unique: RefByUnique<typeof DeclaredAwsVpc>;
        ref: Ref<typeof DeclaredAwsVpc>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpc> | null> => {
    // handle by ref via type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsVpc })(input.by.ref))
        return getOneVpc({ by: { unique: input.by.ref } }, context);
      if (isRefByPrimary({ of: DeclaredAwsVpc })(input.by.ref))
        return getOneVpc({ by: { primary: input.by.ref } }, context);
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
        return [{ Name: 'vpc-id', Values: [input.by.primary.id] }];
      if (input.by.unique)
        return [{ Name: 'tag:exid', Values: [input.by.unique.exid] }];
      throw new UnexpectedCodePathError(
        'not referenced by primary nor unique. how not?',
        { input },
      );
    })();

    // execute the describe command
    const describeCommand = new DescribeVpcsCommand({ Filters: filters });

    try {
      const response = await ec2.send(describeCommand);

      // return null if no VPCs found
      if (!response.Vpcs || response.Vpcs.length === 0) return null;

      const vpc = response.Vpcs[0]!;

      // failfast if vpc id is absent
      if (!vpc.VpcId)
        UnexpectedCodePathError.throw('vpc lacks id; cannot get attributes', {
          vpc,
        });

      // get DNS attributes (not included in DescribeVpcs response)
      const [dnsHostnames, dnsSupport] = await Promise.all([
        ec2.send(
          new DescribeVpcAttributeCommand({
            VpcId: vpc.VpcId,
            Attribute: 'enableDnsHostnames',
          }),
        ),
        ec2.send(
          new DescribeVpcAttributeCommand({
            VpcId: vpc.VpcId,
            Attribute: 'enableDnsSupport',
          }),
        ),
      ]);

      // cast and return
      return castIntoDeclaredAwsVpc({
        vpc,
        vpcDns: {
          hostnames: dnsHostnames.EnableDnsHostnames?.Value ?? false,
          support: dnsSupport.EnableDnsSupport?.Value ?? false,
        },
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle vpc not found
      if (error.name === 'InvalidVpcID.NotFound') return null;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      if (metadata?.httpStatusCode === 404) return null;

      throw new HelpfulError('aws.getOneVpc error', {
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
