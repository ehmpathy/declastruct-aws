import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsSsmVpcTunnel } from '@src/domain.objects/DeclaredAwsSsmVpcTunnel';

/**
 * .what = transforms tunnel unique ref + status into DeclaredAwsSsmVpcTunnel
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsSsmVpcTunnel = (input: {
  unique: RefByUnique<typeof DeclaredAwsSsmVpcTunnel>;
  status: 'OPEN' | 'CLOSED';
  pid: number | null;
}): HasReadonly<typeof DeclaredAwsSsmVpcTunnel> => {
  return assure(
    DeclaredAwsSsmVpcTunnel.as({
      ...input.unique,
      status: input.status,
      pid: input.pid,
    }),
    hasReadonly({ of: DeclaredAwsSsmVpcTunnel }),
  );
};
