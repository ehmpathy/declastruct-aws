import { given, then, when } from 'test-fns';

import { asSsmSshTunnel } from './asSsmSshTunnel';
import { asSsmSshTunnelState } from './asSsmSshTunnelState';

describe('asSsmSshTunnel', () => {
  given('[case1] session health connected', () => {
    when('[t0] cast is called', () => {
      then('returns OPEN tunnel', () => {
        const result = asSsmSshTunnel({
          instanceExid: 'my-instance',
          fromPort: 2222,
          intoPort: 22,
          sessionHealth: {
            status: 'connected',
            pid: 12345,
            spawnedAt: '2026-06-22T10:00:00Z',
          },
        });

        expect(result.instance).toEqual({ exid: 'my-instance' });
        expect(result.from).toEqual({ port: 2222 });
        expect(result.into).toEqual({ port: 22 });
        expect(result.status).toBe('OPEN');
        expect(result.pid).toBe(12345);
        expect(result.spawnedAt).toBe('2026-06-22T10:00:00Z');
      });
    });
  });

  given('[case2] session health not connected', () => {
    when('[t0] cast is called', () => {
      then('returns CLOSED tunnel', () => {
        const result = asSsmSshTunnel({
          instanceExid: 'my-instance',
          fromPort: 2222,
          intoPort: 22,
          sessionHealth: {
            status: 'notconnected',
            pid: null,
            spawnedAt: null,
          },
        });

        expect(result.status).toBe('CLOSED');
        expect(result.pid).toBeNull();
        expect(result.spawnedAt).toBeNull();
      });
    });
  });
});

describe('asSsmSshTunnelState', () => {
  given('[case1] null tunnel', () => {
    when('[t0] state is derived', () => {
      then('returns CLOSED', () => {
        const result = asSsmSshTunnelState({ tunnel: null });
        expect(result).toBe('CLOSED');
      });
    });
  });

  given('[case2] tunnel with OPEN status', () => {
    when('[t0] state is derived', () => {
      then('returns OPEN', () => {
        const result = asSsmSshTunnelState({
          tunnel: {
            instance: { exid: 'my-instance' },
            from: { port: 2222 },
            into: { port: 22 },
            status: 'OPEN',
            pid: 12345,
            spawnedAt: '2026-06-22T10:00:00Z',
          },
        });
        expect(result).toBe('OPEN');
      });
    });
  });

  given('[case3] tunnel with CLOSED status', () => {
    when('[t0] state is derived', () => {
      then('returns CLOSED', () => {
        const result = asSsmSshTunnelState({
          tunnel: {
            instance: { exid: 'my-instance' },
            from: { port: 2222 },
            into: { port: 22 },
            status: 'CLOSED',
            pid: null,
            spawnedAt: null,
          },
        });
        expect(result).toBe('CLOSED');
      });
    });
  });
});
