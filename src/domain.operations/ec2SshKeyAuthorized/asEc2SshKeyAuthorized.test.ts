import { given, then, when } from 'test-fns';

import { asEc2SshKeyAuthorized } from './asEc2SshKeyAuthorized';
import { asEc2SshKeyAuthorizedState } from './asEc2SshKeyAuthorizedState';

describe('asEc2SshKeyAuthorized', () => {
  given('[case1] valid SSM parameter value', () => {
    const paramValue = JSON.stringify({
      publicKey: 'ssh-ed25519 AAAA... test@example',
      fingerprint: 'SHA256:abc123',
      authorizedAt: '2026-06-22T10:00:00Z',
      comment: 'test@example',
      user: 'ubuntu',
    });

    when('[t0] cast is called', () => {
      then('returns domain object with all fields', () => {
        const result = asEc2SshKeyAuthorized({
          instanceExid: 'my-instance',
          paramValue,
        });

        expect(result.instance).toEqual({ exid: 'my-instance' });
        expect(result.publicKey).toBe('ssh-ed25519 AAAA... test@example');
        expect(result.comment).toBe('test@example');
        expect(result.user).toBe('ubuntu');
        expect(result.fingerprint).toBe('SHA256:abc123');
        expect(result.authorizedAt).toBe('2026-06-22T10:00:00Z');
      });
    });
  });

  given('[case2] legacy SSM parameter value without user', () => {
    const paramValue = JSON.stringify({
      publicKey: 'ssh-ed25519 AAAA... test@example',
      fingerprint: 'SHA256:abc123',
      authorizedAt: '2026-06-22T10:00:00Z',
      comment: 'test@example',
    });

    when('[t0] cast is called', () => {
      then('defaults user to ec2-user (external-data boundary)', () => {
        const result = asEc2SshKeyAuthorized({
          instanceExid: 'my-instance',
          paramValue,
        });
        expect(result.user).toBe('ec2-user');
      });
    });
  });
});

describe('asEc2SshKeyAuthorizedState', () => {
  given('[case1] null key record', () => {
    when('[t0] state is derived', () => {
      then('returns notauthorized', () => {
        const result = asEc2SshKeyAuthorizedState({ keyAuthorized: null });
        expect(result).toBe('notauthorized');
      });
    });
  });

  given('[case2] key record with fingerprint', () => {
    when('[t0] state is derived', () => {
      then('returns authorized', () => {
        const result = asEc2SshKeyAuthorizedState({
          keyAuthorized: {
            instance: { exid: 'my-instance' },
            publicKey: 'ssh-ed25519 AAAA...',
            comment: 'test@example',
            user: 'ec2-user',
            fingerprint: 'SHA256:abc123',
            authorizedAt: '2026-06-22T10:00:00Z',
          },
        });
        expect(result).toBe('authorized');
      });
    });
  });

  given('[case3] key record without fingerprint', () => {
    when('[t0] state is derived', () => {
      then('returns notauthorized', () => {
        const result = asEc2SshKeyAuthorizedState({
          keyAuthorized: {
            instance: { exid: 'my-instance' },
            publicKey: 'ssh-ed25519 AAAA...',
            comment: 'test@example',
            user: 'ec2-user',
            fingerprint: undefined,
            authorizedAt: undefined,
          },
        });
        expect(result).toBe('notauthorized');
      });
    });
  });
});
