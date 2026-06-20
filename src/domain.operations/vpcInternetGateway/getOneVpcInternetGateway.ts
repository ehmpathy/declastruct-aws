import {
  DescribeInternetGatewaysCommand,
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
import { DeclaredAwsVpcInternetGateway } from '@src/domain.objects/DeclaredAwsVpcInternetGateway';
import { getOneVpcExid } from '@src/domain.operations/vpc/getOneVpcExid';

import { castIntoDeclaredAwsVpcInternetGateway } from './castIntoDeclaredAwsVpcInternetGateway';

/**
 * .what = gets a single VPC internet gateway from AWS
 * .why = enables lookup by primary (id) or unique (exid tag)
 */
export const getOneVpcInternetGateway = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsVpcInternetGateway>;
        unique: RefByUnique<typeof DeclaredAwsVpcInternetGateway>;
        ref: Ref<typeof DeclaredAwsVpcInternetGateway>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcInternetGateway> | null> => {
    // handle by ref via type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsVpcInternetGateway })(input.by.ref))
        return getOneVpcInternetGateway(
          { by: { unique: input.by.ref } },
          context,
        );
      if (isRefByPrimary({ of: DeclaredAwsVpcInternetGateway })(input.by.ref))
        return getOneVpcInternetGateway(
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
        return [{ Name: 'internet-gateway-id', Values: [input.by.primary.id] }];
      if (input.by.unique)
        return [{ Name: 'tag:exid', Values: [input.by.unique.exid] }];
      throw new UnexpectedCodePathError(
        'not referenced by primary nor unique. how not?',
        { input },
      );
    })();

    // execute the describe command
    const describeCommand = new DescribeInternetGatewaysCommand({
      Filters: filters,
    });

    try {
      const response = await ec2.send(describeCommand);

      // return null if no internet gateways found
      if (!response.InternetGateways || response.InternetGateways.length === 0)
        return null;

      const igw = response.InternetGateways[0]!;

      // get VPC ID from attachment (internet gateway must be attached)
      const attachment = igw.Attachments?.find(
        (a) => (a.State as string) === 'available',
      );
      if (!attachment?.VpcId)
        UnexpectedCodePathError.throw(
          'internet gateway not attached to vpc; cannot lookup vpc exid',
          { igw },
        );

      // lookup VPC exid from id
      const vpcExid = await getOneVpcExid({ vpcId: attachment.VpcId }, context);

      // cast and return
      return castIntoDeclaredAwsVpcInternetGateway(igw, vpcExid);
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle internet gateway not found
      if (error.name === 'InvalidInternetGatewayID.NotFound') return null;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      if (metadata?.httpStatusCode === 404) return null;

      throw new HelpfulError('aws.getOneVpcInternetGateway error', {
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
