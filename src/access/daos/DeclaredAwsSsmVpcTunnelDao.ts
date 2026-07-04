import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsmVpcTunnel } from '@src/domain.objects/DeclaredAwsSsmVpcTunnel';
import { getOneSsmVpcTunnel } from '@src/domain.operations/ssmVpcTunnel/getOneSsmVpcTunnel';
import { setSsmVpcTunnel } from '@src/domain.operations/ssmVpcTunnel/setSsmVpcTunnel';

/**
 * .what = declastruct DAO for AWS VPC tunnel resources
 * .why = wraps existing tunnel operations to conform to declastruct interface
 */
export const DeclaredAwsSsmVpcTunnelDao = genDeclastructDao<
  typeof DeclaredAwsSsmVpcTunnel,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSsmVpcTunnel,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneSsmVpcTunnel({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSsmVpcTunnel(input, context);
    },
    upsert: async (input, context) => {
      return setSsmVpcTunnel(input, context);
    },
    delete: null,
  },
});
