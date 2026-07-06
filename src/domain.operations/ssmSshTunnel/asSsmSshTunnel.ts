import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsSsmSshTunnel } from '@src/domain.objects/DeclaredAwsSsmSshTunnel';

/**
 * .what = casts session health data to DeclaredAwsSsmSshTunnel
 * .why = transforms health check result to domain object for orchestrator use
 */
export const asSsmSshTunnel = (input: {
  instanceExid: string;
  fromPort: number;
  intoPort: number;
  sessionHealth: {
    status: 'connected' | 'notconnected';
    pid?: number | null;
    spawnedAt?: string | null;
  };
}): HasReadonly<typeof DeclaredAwsSsmSshTunnel> => {
  // derive status from session health
  const status: 'OPEN' | 'CLOSED' =
    input.sessionHealth.status === 'connected' ? 'OPEN' : 'CLOSED';

  // return domain object with readonly fields
  return assure(
    DeclaredAwsSsmSshTunnel.as({
      instance: { exid: input.instanceExid },
      from: { port: input.fromPort },
      into: { port: input.intoPort },
      status,
      pid: input.sessionHealth.pid ?? null,
      spawnedAt: input.sessionHealth.spawnedAt ?? null,
    }),
    hasReadonly({ of: DeclaredAwsSsmSshTunnel }),
  );
};
