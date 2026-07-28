import { given, then, when } from 'test-fns';

import { ec2InstanceMetadataOptionsSecure } from './DeclaredAwsEc2InstanceMetadataOptions';
import { DeclaredAwsEc2LaunchTemplate } from './DeclaredAwsEc2LaunchTemplate';

/**
 * .what = colocated proof of the constructor's metadataOptions canonicalization invariant
 * .why = the constructor override is the chokepoint the whole KEEP-convergence design rests
 *   on (see the class doc-notes + asCanonicalEc2InstanceMetadataOptions). the end-to-end
 *   KEEP proof lives in castIntoDeclaredAwsEc2LaunchTemplate.test.ts, but a future engineer
 *   who touches THIS constructor looks for its test HERE — so the invariant is proven next
 *   to the code that holds it: every secure form (null OR the literal secure values)
 *   collapses to the ONE canonical null; every non-default value is preserved verbatim
 */
describe('DeclaredAwsEc2LaunchTemplate constructor canonicalization', () => {
  const baseProps = {
    exid: 'canonicalization-test',
    instanceType: 't3.micro',
    imageId: 'ami-000000000000',
    hibernation: false,
    rootVolumeSize: 8,
    rootVolumeEncrypted: true,
    iamInstanceProfile: null,
    userData: null,
    tags: null,
  };

  given('a null metadataOptions (the omitted-field secure default)', () => {
    when('constructed', () => {
      then('metadataOptions stays null (already canonical)', () => {
        const template = DeclaredAwsEc2LaunchTemplate.as({
          ...baseProps,
          metadataOptions: null,
        });
        expect(template.metadataOptions).toBeNull();
      });
    });
  });

  given('a literal secure metadataOptions (required / 1 / enabled)', () => {
    when('constructed', () => {
      then(
        'metadataOptions collapses to null (the ONE canonical secure form)',
        () => {
          const template = DeclaredAwsEc2LaunchTemplate.as({
            ...baseProps,
            metadataOptions: {
              httpTokens: 'required',
              httpPutResponseHopLimit: 1,
              httpEndpoint: 'enabled',
            },
          });
          // a caller who declares the literal secure values must converge to the same null a
          // secure read-back collapses to, else the box plans UPDATE forever (immutable throw)
          expect(template.metadataOptions).toBeNull();
        },
      );
    });
  });

  given('the exported ec2InstanceMetadataOptionsSecure spread', () => {
    when('constructed', () => {
      then('it also collapses to null', () => {
        const template = DeclaredAwsEc2LaunchTemplate.as({
          ...baseProps,
          metadataOptions: { ...ec2InstanceMetadataOptionsSecure },
        });
        expect(template.metadataOptions).toBeNull();
      });
    });
  });

  given('an explicit opt-out metadataOptions (httpTokens: optional)', () => {
    when('constructed', () => {
      then(
        'metadataOptions is preserved verbatim (a non-default posture)',
        () => {
          const template = DeclaredAwsEc2LaunchTemplate.as({
            ...baseProps,
            metadataOptions: {
              httpTokens: 'optional',
              httpPutResponseHopLimit: 1,
              httpEndpoint: 'enabled',
            },
          });
          expect(template.metadataOptions).toEqual({
            httpTokens: 'optional',
            httpPutResponseHopLimit: 1,
            httpEndpoint: 'enabled',
          });
        },
      );
    });
  });

  given('an explicit hop-2 metadataOptions (docker)', () => {
    when('constructed', () => {
      then('metadataOptions is preserved verbatim', () => {
        const template = DeclaredAwsEc2LaunchTemplate.as({
          ...baseProps,
          metadataOptions: {
            httpTokens: 'required',
            httpPutResponseHopLimit: 2,
            httpEndpoint: 'enabled',
          },
        });
        expect(template.metadataOptions).toEqual({
          httpTokens: 'required',
          httpPutResponseHopLimit: 2,
          httpEndpoint: 'enabled',
        });
      });
    });
  });
});
