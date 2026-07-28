import type { LaunchTemplateInstanceMetadataOptions } from '@aws-sdk/client-ec2';
import { given, then, when } from 'test-fns';

import { ec2InstanceMetadataOptionsAwsImplicit } from '@src/domain.objects/DeclaredAwsEc2InstanceMetadataOptions';

import { asDeclaredAwsEc2InstanceMetadataOptions } from './asDeclaredAwsEc2InstanceMetadataOptions';

// note: this transformer returns the HONEST effective value (never collapsed). the
// secure-equal -> null collapse is a separate concern, applied at
// DeclaredAwsEc2LaunchTemplate construction (see asCanonicalEc2InstanceMetadataOptions
// + its tests, and the KEEP-convergence proof in castIntoDeclaredAwsEc2LaunchTemplate.test)
describe('asDeclaredAwsEc2InstanceMetadataOptions', () => {
  given('AWS omitted MetadataOptions (a pre-feature template)', () => {
    when('read into the domain shape', () => {
      then(
        'it reads back the AWS implicit (imdsv1-allowed) default, NOT secure',
        () => {
          // a template created before this feature sends no MetadataOptions, so aws
          // omits it — the box is imdsv1-allowed. the honest read (not secure) lets a
          // pre-feature template plan a change instead of a false KEEP
          const result = asDeclaredAwsEc2InstanceMetadataOptions({
            metadataOptions: undefined,
          });
          expect(result).toEqual(ec2InstanceMetadataOptionsAwsImplicit);
          expect(result.httpTokens).toBe('optional');
        },
      );
    });
  });

  given('AWS returned a present-but-empty {} block (no sub-field set)', () => {
    when('read into the domain shape', () => {
      then(
        'it reads back the AWS implicit (imdsv1-allowed) default, NOT secure',
        () => {
          // a present-but-empty block carries NO posture, same as an omitted key. it must
          // take the honest insecure read — if it fell through to the per-sub-field secure
          // fallback it would read back fully secure and false-KEEP an imdsv1-allowed box
          const result = asDeclaredAwsEc2InstanceMetadataOptions({
            metadataOptions: {},
          });
          expect(result).toEqual(ec2InstanceMetadataOptionsAwsImplicit);
          expect(result.httpTokens).toBe('optional');
        },
      );
    });
  });

  given('AWS returned the full secure values', () => {
    const metadataOptions: LaunchTemplateInstanceMetadataOptions = {
      HttpTokens: 'required',
      HttpPutResponseHopLimit: 1,
      HttpEndpoint: 'enabled',
    };
    when('read into the domain shape', () => {
      then(
        'it maps the effective triple (NOT collapsed — that is the ctor)',
        () => {
          expect(
            asDeclaredAwsEc2InstanceMetadataOptions({ metadataOptions }),
          ).toEqual({
            httpTokens: 'required',
            httpPutResponseHopLimit: 1,
            httpEndpoint: 'enabled',
          });
        },
      );
    });
  });

  given('AWS returned the imdsv1 opt-out value', () => {
    const metadataOptions: LaunchTemplateInstanceMetadataOptions = {
      HttpTokens: 'optional',
      HttpPutResponseHopLimit: 1,
      HttpEndpoint: 'enabled',
    };
    when('read into the domain shape', () => {
      then('it maps the explicit opt-out unchanged', () => {
        expect(
          asDeclaredAwsEc2InstanceMetadataOptions({ metadataOptions }),
        ).toEqual({
          httpTokens: 'optional',
          httpPutResponseHopLimit: 1,
          httpEndpoint: 'enabled',
        });
      });
    });
  });

  given('AWS returned a raised hop limit (docker)', () => {
    const metadataOptions: LaunchTemplateInstanceMetadataOptions = {
      HttpTokens: 'required',
      HttpPutResponseHopLimit: 2,
      HttpEndpoint: 'enabled',
    };
    when('read into the domain shape', () => {
      then('it maps the explicit hop-2 value unchanged', () => {
        expect(
          asDeclaredAwsEc2InstanceMetadataOptions({ metadataOptions }),
        ).toEqual({
          httpTokens: 'required',
          httpPutResponseHopLimit: 2,
          httpEndpoint: 'enabled',
        });
      });
    });
  });

  given('AWS returned a PARTIAL object (only httpTokens set)', () => {
    // the response type marks each sub-field optional — the transformer fills each
    // absent sub-field from the secure value
    const metadataOptions: LaunchTemplateInstanceMetadataOptions = {
      HttpTokens: 'optional',
    };
    when('read into the domain shape', () => {
      then('absent sub-fields fall back to the secure value', () => {
        expect(
          asDeclaredAwsEc2InstanceMetadataOptions({ metadataOptions }),
        ).toEqual({
          httpTokens: 'optional',
          httpPutResponseHopLimit: 1,
          httpEndpoint: 'enabled',
        });
      });
    });
  });

  given(
    'AWS returned a PARTIAL object (hop limit absent, present all secure)',
    () => {
      const metadataOptions: LaunchTemplateInstanceMetadataOptions = {
        HttpTokens: 'required',
        HttpEndpoint: 'enabled',
      };
      when('read into the domain shape', () => {
        then('the absent hop limit falls back to the secure value (1)', () => {
          expect(
            asDeclaredAwsEc2InstanceMetadataOptions({ metadataOptions }),
          ).toEqual({
            httpTokens: 'required',
            httpPutResponseHopLimit: 1,
            httpEndpoint: 'enabled',
          });
        });
      });
    },
  );
});
