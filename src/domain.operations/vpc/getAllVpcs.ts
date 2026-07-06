import {
  DescribeVpcAttributeCommand,
  DescribeVpcsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';

import { castIntoDeclaredAwsVpc } from './castIntoDeclaredAwsVpc';

/**
 * .what = gets all VPCs that match a set of tag filters
 * .why = enables enumeration of declastruct-managed VPCs for sweeps and audits
 *   - lookups by single exid answer "does this one exist"; this answers
 *     "which VPCs carry these tags" (e.g. all leftover integration-test VPCs)
 *   - the both-ends test cleanup needs this to find orphan VPCs left by a prior
 *     crashed run whose exids are unknown
 * .note = every matched VPC must carry an exid tag (castIntoDeclaredAwsVpc
 *   failfasts otherwise); tag-filter on declastruct-managed VPCs to guarantee it
 */
export const getAllVpcs = asProcedure(
  async (
    input: {
      by: { tags: Record<string, string> };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpc>[]> => {
    // declare the client
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // build tag filters from the desired tag set
    const filters = Object.entries(input.by.tags).map(([key, value]) => ({
      Name: `tag:${key}`,
      Values: [value],
    }));

    try {
      // describe all VPCs that carry the tags
      const response = await ec2.send(
        new DescribeVpcsCommand({ Filters: filters }),
      );

      // return empty when none match
      const vpcs = response.Vpcs ?? [];
      if (vpcs.length === 0) return [];

      // cast each, with its DNS attributes (not included in DescribeVpcs)
      return Promise.all(
        vpcs.map(async (vpc) => {
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
          return castIntoDeclaredAwsVpc({
            vpc,
            vpcDns: {
              hostnames: dnsHostnames.EnableDnsHostnames?.Value ?? false,
              support: dnsSupport.EnableDnsSupport?.Value ?? false,
            },
          });
        }),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      throw new HelpfulError('aws.getAllVpcs error', {
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
