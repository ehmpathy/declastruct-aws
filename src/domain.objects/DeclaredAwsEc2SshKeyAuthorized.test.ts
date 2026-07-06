import { given, then, when } from 'test-fns';

import { DeclaredAwsEc2SshKeyAuthorized } from './DeclaredAwsEc2SshKeyAuthorized';

describe('DeclaredAwsEc2SshKeyAuthorized', () => {
  given('required properties', () => {
    when('instantiated', () => {
      let key: DeclaredAwsEc2SshKeyAuthorized;

      then('it should instantiate', () => {
        key = new DeclaredAwsEc2SshKeyAuthorized({
          instance: { exid: 'test-bastion' },
          publicKey:
            'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample test@machine',
          comment: 'test@machine',
          user: 'ec2-user',
        });
      });

      then('it should have the required properties', () => {
        expect(key).toMatchObject({
          instance: { exid: 'test-bastion' },
          publicKey:
            'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample test@machine',
          comment: 'test@machine',
          user: 'ec2-user',
        });
      });

      then('readonly fields are undefined by default', () => {
        expect(key.fingerprint).toBeUndefined();
        expect(key.authorizedAt).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with readonly fields', () => {
      let key: DeclaredAwsEc2SshKeyAuthorized;

      then('it should instantiate', () => {
        key = new DeclaredAwsEc2SshKeyAuthorized({
          instance: { exid: 'test-bastion' },
          publicKey:
            'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample test@machine',
          comment: 'test@machine',
          user: 'ec2-user',
          fingerprint: 'SHA256:abc123def456',
          authorizedAt: '2026-06-23T12:00:00Z',
        });
      });

      then('it should have all properties', () => {
        expect(key).toMatchObject({
          instance: { exid: 'test-bastion' },
          publicKey:
            'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample test@machine',
          comment: 'test@machine',
          user: 'ec2-user',
          fingerprint: 'SHA256:abc123def456',
          authorizedAt: '2026-06-23T12:00:00Z',
        });
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as instance + comment', () => {
      expect(DeclaredAwsEc2SshKeyAuthorized.unique).toEqual([
        'instance',
        'comment',
      ]);
    });

    then('metadata is empty', () => {
      expect(DeclaredAwsEc2SshKeyAuthorized.metadata).toEqual([]);
    });

    then('readonly is defined as fingerprint + authorizedAt', () => {
      expect(DeclaredAwsEc2SshKeyAuthorized.readonly).toEqual([
        'fingerprint',
        'authorizedAt',
      ]);
    });
  });
});
