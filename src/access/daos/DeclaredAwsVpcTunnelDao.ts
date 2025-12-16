import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsVpcTunnel } from '@src/domain.objects/DeclaredAwsVpcTunnel';
import { getVpcTunnel } from '@src/domain.operations/vpcTunnel/getVpcTunnel';
import { setVpcTunnel } from '@src/domain.operations/vpcTunnel/setVpcTunnel';

/**
 * .what = declastruct DAO for AWS VPC tunnel resources
 * .why = wraps existing tunnel operations to conform to declastruct interface
 */
export const DeclaredAwsVpcTunnelDao = genDeclastructDao<
  typeof DeclaredAwsVpcTunnel,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsVpcTunnel,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getVpcTunnel({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setVpcTunnel(input, context);
    },
    upsert: async (input, context) => {
      return setVpcTunnel(input, context);
    },
    delete: null,
  },
});
