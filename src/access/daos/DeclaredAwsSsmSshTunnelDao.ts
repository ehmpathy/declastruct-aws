import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';
import { getOneSsmSshTunnel } from '@src/domain.operations/ssmSshTunnel/getOneSsmSshTunnel';
import { setSsmSshTunnel } from '@src/domain.operations/ssmSshTunnel/setSsmSshTunnel';

/**
 * .what = declastruct DAO for AWS SSM SSH tunnel resources
 * .why = wraps the tunnel operations to conform to the declastruct interface
 *        so the tunnel can be driven declaratively via plan/apply
 */
export const DeclaredAwsSsmSshTunnelDao = genDeclastructDao<
  typeof DeclaredAwsSsmSshTunnel,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsSsmSshTunnel,
  get: {
    one: {
      byPrimary: null,
      byUnique: async (input, context) => {
        return getOneSsmSshTunnel({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setSsmSshTunnel(input, context);
    },
    upsert: async (input, context) => {
      return setSsmSshTunnel(input, context);
    },
    delete: null,
  },
});
