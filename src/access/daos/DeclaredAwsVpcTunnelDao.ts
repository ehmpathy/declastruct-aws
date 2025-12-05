import { DeclastructDao } from 'declastruct';
import { isRefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsVpcTunnel } from '../../domain.objects/DeclaredAwsVpcTunnel';
import { getVpcTunnel } from '../../domain.operations/vpcTunnel/getVpcTunnel';
import { setVpcTunnel } from '../../domain.operations/vpcTunnel/setVpcTunnel';

/**
 * .what = declastruct DAO for AWS VPC tunnel resources
 * .why = wraps existing tunnel operations to conform to declastruct interface
 */
export const DeclaredAwsVpcTunnelDao = new DeclastructDao<
  DeclaredAwsVpcTunnel,
  typeof DeclaredAwsVpcTunnel,
  ContextAwsApi & ContextLogTrail
>({
  get: {
    byUnique: async (input, context) => {
      return getVpcTunnel({ by: { unique: input } }, context);
    },
    byRef: async (input, context) => {
      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsVpcTunnel })(input))
        return getVpcTunnel({ by: { unique: input } }, context);

      // failfast if ref is not by unique (VPC tunnels don't have primary key lookup)
      UnexpectedCodePathError.throw('unsupported ref type', { input });
    },
  },
  set: {
    finsert: async (input, context) => {
      return setVpcTunnel(input, context);
    },
    upsert: async (input, context) => {
      return setVpcTunnel(input, context);
    },
  },
});
