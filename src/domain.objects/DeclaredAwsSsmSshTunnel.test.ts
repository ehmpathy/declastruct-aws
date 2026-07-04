import { given, then, when } from 'test-fns';

import { DeclaredAwsSsmSshTunnel } from './DeclaredAwsSsmSshTunnel';

describe('DeclaredAwsSsmSshTunnel', () => {
  given('required properties', () => {
    when('instantiated', () => {
      let tunnel: DeclaredAwsSsmSshTunnel;

      then('it should instantiate', () => {
        tunnel = new DeclaredAwsSsmSshTunnel({
          instance: { exid: 'test-bastion' },
          from: { port: 2222 },
          into: { port: 22 },
          status: 'CLOSED',
        });
      });

      then('it should have the required properties', () => {
        expect(tunnel).toMatchObject({
          instance: { exid: 'test-bastion' },
          from: { port: 2222 },
          into: { port: 22 },
          status: 'CLOSED',
        });
      });

      then('readonly fields are undefined by default', () => {
        expect(tunnel.pid).toBeUndefined();
        expect(tunnel.spawnedAt).toBeUndefined();
      });
    });
  });

  given('tunnel is OPEN', () => {
    when('instantiated with readonly fields', () => {
      let tunnel: DeclaredAwsSsmSshTunnel;

      then('it should instantiate', () => {
        tunnel = new DeclaredAwsSsmSshTunnel({
          instance: { exid: 'test-bastion' },
          from: { port: 2222 },
          into: { port: 22 },
          status: 'OPEN',
          pid: 12345,
          spawnedAt: '2026-06-23T12:00:00Z',
        });
      });

      then('it should have all properties', () => {
        expect(tunnel).toMatchObject({
          instance: { exid: 'test-bastion' },
          from: { port: 2222 },
          into: { port: 22 },
          status: 'OPEN',
          pid: 12345,
          spawnedAt: '2026-06-23T12:00:00Z',
        });
      });
    });
  });

  given('tunnel is CLOSED', () => {
    when('instantiated with null readonly fields', () => {
      let tunnel: DeclaredAwsSsmSshTunnel;

      then('it should instantiate with null pid/spawnedAt', () => {
        tunnel = new DeclaredAwsSsmSshTunnel({
          instance: { exid: 'test-bastion' },
          from: { port: 2222 },
          into: { port: 22 },
          status: 'CLOSED',
          pid: null,
          spawnedAt: null,
        });
      });

      then('readonly fields are null', () => {
        expect(tunnel.pid).toBeNull();
        expect(tunnel.spawnedAt).toBeNull();
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as instance + from', () => {
      expect(DeclaredAwsSsmSshTunnel.unique).toEqual(['instance', 'from']);
    });

    then('metadata is empty', () => {
      expect(DeclaredAwsSsmSshTunnel.metadata).toEqual([]);
    });

    then('readonly is defined as pid + spawnedAt', () => {
      expect(DeclaredAwsSsmSshTunnel.readonly).toEqual(['pid', 'spawnedAt']);
    });
  });
});
