import { given, then, when } from 'test-fns';

import {
  asCanonicalEc2InstanceMetadataOptions,
  DeclaredAwsEc2InstanceMetadataOptions,
  ec2InstanceMetadataOptionsAwsImplicit,
  ec2InstanceMetadataOptionsSecure,
} from './DeclaredAwsEc2InstanceMetadataOptions';

describe('asCanonicalEc2InstanceMetadataOptions', () => {
  given('a null metadataOptions', () => {
    when('canonicalized', () => {
      then(
        'it stays null (already the secure-by-default canonical form)',
        () => {
          expect(asCanonicalEc2InstanceMetadataOptions(null)).toBeNull();
        },
      );
    });
  });

  given('a value structurally equal to the secure default', () => {
    when('canonicalized', () => {
      then('it collapses to null so a secure box converges to KEEP', () => {
        // a caller who writes the literal secure values (or spreads the exported
        // secure const) must converge to the SAME null a null-declaration + a
        // secure read-back reduce to — else it plans UPDATE forever (immutable)
        expect(
          asCanonicalEc2InstanceMetadataOptions({
            httpTokens: 'required',
            httpPutResponseHopLimit: 1,
            httpEndpoint: 'enabled',
          }),
        ).toBeNull();
      });

      then('the exported secure const itself collapses to null', () => {
        expect(
          asCanonicalEc2InstanceMetadataOptions(
            ec2InstanceMetadataOptionsSecure,
          ),
        ).toBeNull();
      });

      then(
        'a DomainObject INSTANCE of the secure default also collapses to null',
        () => {
          // guards the spread-before-serialize normalization: serialize() tags a
          // DomainObject instance with a _dobj key, so without the spread an instance
          // of the secure value would NOT collapse — a re-introduction of the
          // UPDATE-forever / immutable-throw bug. a caller who passes an instance (not
          // a bare literal) must converge to the same null.
          expect(
            asCanonicalEc2InstanceMetadataOptions(
              new DeclaredAwsEc2InstanceMetadataOptions({
                httpTokens: 'required',
                httpPutResponseHopLimit: 1,
                httpEndpoint: 'enabled',
              }),
            ),
          ).toBeNull();
        },
      );
    });
  });

  given('an explicit endpoint-disabled value (metadata off entirely)', () => {
    when('canonicalized', () => {
      then(
        'it is preserved unchanged (non-secure -> honestly diffed, not collapsed)',
        () => {
          // httpEndpoint=disabled is the vision's named foot-gun (it blinds the
          // instance role entirely). it is non-secure, so it must be preserved + diffed
          // honestly, never collapsed to the secure null.
          const disabled = {
            httpTokens: 'required' as const,
            httpPutResponseHopLimit: 1,
            httpEndpoint: 'disabled' as const,
          };
          expect(asCanonicalEc2InstanceMetadataOptions(disabled)).toEqual(
            disabled,
          );
        },
      );
    });
  });

  given('an explicit opt-out value (httpTokens=optional)', () => {
    when('canonicalized', () => {
      then('it is preserved unchanged (honest non-default posture)', () => {
        const optOut = {
          httpTokens: 'optional' as const,
          httpPutResponseHopLimit: 1,
          httpEndpoint: 'enabled' as const,
        };
        expect(asCanonicalEc2InstanceMetadataOptions(optOut)).toEqual(optOut);
      });
    });
  });

  given('an explicit raised-hop-limit value (docker, hop 2)', () => {
    when('canonicalized', () => {
      then('it is preserved unchanged', () => {
        const docker = {
          httpTokens: 'required' as const,
          httpPutResponseHopLimit: 2,
          httpEndpoint: 'enabled' as const,
        };
        expect(asCanonicalEc2InstanceMetadataOptions(docker)).toEqual(docker);
      });
    });
  });

  given('the AWS-implicit (imdsv1-allowed) value', () => {
    when('canonicalized', () => {
      then(
        'it is preserved (non-secure -> a pre-feature box plans a change)',
        () => {
          expect(
            asCanonicalEc2InstanceMetadataOptions(
              ec2InstanceMetadataOptionsAwsImplicit,
            ),
          ).toEqual(ec2InstanceMetadataOptionsAwsImplicit);
        },
      );
    });
  });
});

describe('the shared secure-default consts are frozen', () => {
  // these two objects are the single, module-level fallback that backs every launch
  // template declared with metadataOptions: null. a frozen const makes an accidental
  // in-place write (instead of a spread) throw in strict mode instead of a silent
  // degrade of the secure default for every subsequent declaration.
  given('ec2InstanceMetadataOptionsSecure', () => {
    when('inspected', () => {
      then('it is frozen, so an in-place mutation cannot stick', () => {
        expect(Object.isFrozen(ec2InstanceMetadataOptionsSecure)).toBe(true);
        // a write does not stick (silently ignored in loose mode, throws in strict)
        try {
          (
            ec2InstanceMetadataOptionsSecure as { httpTokens: string }
          ).httpTokens = 'optional';
        } catch {
          // strict-mode throw is the intended guard; loose-mode no-op is also fine
        }
        expect(ec2InstanceMetadataOptionsSecure.httpTokens).toBe('required');
      });
    });
  });

  given('ec2InstanceMetadataOptionsAwsImplicit', () => {
    when('inspected', () => {
      then('it is frozen', () => {
        expect(Object.isFrozen(ec2InstanceMetadataOptionsAwsImplicit)).toBe(
          true,
        );
      });
    });
  });
});
