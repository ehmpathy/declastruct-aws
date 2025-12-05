import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsVpcTunnel } from '../../domain.objects/DeclaredAwsVpcTunnel';

/**
 * .what = transforms tunnel unique ref + status into DeclaredAwsVpcTunnel
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsVpcTunnel = (input: {
  unique: RefByUnique<typeof DeclaredAwsVpcTunnel>;
  status: 'OPEN' | 'CLOSED';
  pid: number | null;
}): HasReadonly<typeof DeclaredAwsVpcTunnel> => {
  return assure(
    DeclaredAwsVpcTunnel.as({
      ...input.unique,
      status: input.status,
      pid: input.pid,
    }),
    hasReadonly({ of: DeclaredAwsVpcTunnel }),
  );
};
