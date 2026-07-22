import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsSsmParameterPlain } from './castIntoDeclaredAwsSsmParameterPlain';

describe('castIntoDeclaredAwsSsmParameterPlain', () => {
  given(
    '[case1] a plaintext parameter with a readable value + description + tags',
    () => {
      const raw = {
        name: '/svc-notifications/prod/log-level',
        value: 'info',
        arn: 'arn:aws:ssm:us-east-1:123456789012:parameter/svc-notifications/prod/log-level',
        description: 'the log level',
        tags: { managedBy: 'declastruct', service: 'svc-notifications' },
        version: 2,
        lastModifiedAt: '2026-07-19T00:00:00.000Z',
      };

      when('[t0] the raw parameter is cast', () => {
        const result = castIntoDeclaredAwsSsmParameterPlain(raw);

        then('the value is carried through for value-compare drift', () => {
          expect(result.value).toEqual('info');
        });

        then(
          'description + tags are carried through as roundtrip fields',
          () => {
            expect(result.description).toEqual('the log level');
            expect(result.tags).toEqual({
              managedBy: 'declastruct',
              service: 'svc-notifications',
            });
          },
        );

        then('identity + readonly fields are carried through', () => {
          expect(result.name).toEqual(raw.name);
          expect(result.arn).toEqual(raw.arn);
          expect(result.version).toEqual(2);
        });
      });
    },
  );

  given('[case2] a plaintext parameter with no description and no tags', () => {
    const raw = {
      name: '/svc-notifications/prod/log-level',
      value: 'info',
      arn: 'arn:aws:ssm:us-east-1:123456789012:parameter/svc-notifications/prod/log-level',
      description: null,
      tags: null,
      version: 1,
      lastModifiedAt: '2026-07-19T00:00:00.000Z',
    };

    when('[t0] the raw parameter is cast', () => {
      const result = castIntoDeclaredAwsSsmParameterPlain(raw);

      then(
        'description + tags are null (so a declared null converges to KEEP)',
        () => {
          expect(result.description).toEqual(null);
          expect(result.tags).toEqual(null);
        },
      );
    });
  });
});
