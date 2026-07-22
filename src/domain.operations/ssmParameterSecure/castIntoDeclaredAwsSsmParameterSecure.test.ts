import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsSsmParameterSecure } from './castIntoDeclaredAwsSsmParameterSecure';

describe('castIntoDeclaredAwsSsmParameterSecure', () => {
  given('[case1] metadata that reports the account default key alias', () => {
    const metadata = {
      name: '/svc-notifications/prod/twilio/auth-token',
      arn: 'arn:aws:ssm:us-east-1:123456789012:parameter/svc-notifications/prod/twilio/auth-token',
      keyId: 'alias/aws/ssm',
      description: 'the twilio auth token',
      tags: { managedBy: 'declastruct', service: 'svc-notifications' },
      version: 3,
      lastModifiedAt: '2026-07-19T00:00:00.000Z',
    };

    when('[t0] the metadata is cast', () => {
      const result = castIntoDeclaredAwsSsmParameterSecure(metadata);

      then('keyId maps to null so a declared null converges to KEEP', () => {
        expect(result.keyId).toBeNull();
      });

      then('value is never read back (write-only)', () => {
        expect(result.value).toBeUndefined();
      });

      then('description + tags are carried through as roundtrip fields', () => {
        expect(result.description).toEqual('the twilio auth token');
        expect(result.tags).toEqual({
          managedBy: 'declastruct',
          service: 'svc-notifications',
        });
      });

      then('identity + readonly fields are carried through', () => {
        expect(result.name).toEqual(metadata.name);
        expect(result.arn).toEqual(metadata.arn);
        expect(result.version).toEqual(3);
      });
    });
  });

  given('[case2] metadata that reports a customer-managed key', () => {
    const metadata = {
      name: '/svc-notifications/prod/openphone/apikey',
      arn: 'arn:aws:ssm:us-east-1:123456789012:parameter/svc-notifications/prod/openphone/apikey',
      keyId: 'arn:aws:kms:us-east-1:123456789012:key/abc-123',
      description: null,
      tags: null,
      version: 1,
      lastModifiedAt: '2026-07-19T00:00:00.000Z',
    };

    when('[t0] the metadata is cast', () => {
      const result = castIntoDeclaredAwsSsmParameterSecure(metadata);

      then('a customer-managed keyId passes through unchanged', () => {
        expect(result.keyId).toEqual(metadata.keyId);
      });

      then('value stays undefined regardless of the key', () => {
        expect(result.value).toBeUndefined();
      });
    });
  });

  given('[case3] metadata with an explicit null keyId', () => {
    const metadata = {
      name: '/svc-notifications/prod/db/password',
      arn: 'arn:aws:ssm:us-east-1:123456789012:parameter/svc-notifications/prod/db/password',
      keyId: null,
      description: null,
      tags: null,
      version: 7,
      lastModifiedAt: '2026-07-19T00:00:00.000Z',
    };

    when('[t0] the metadata is cast', () => {
      const result = castIntoDeclaredAwsSsmParameterSecure(metadata);

      then('a null keyId stays null', () => {
        expect(result.keyId).toBeNull();
      });
    });
  });
});
