import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getCostExplorerPreferenceGuidanceError } from './getCostExplorerPreferenceGuidanceError';

describe('getCostExplorerPreferenceGuidanceError', () => {
  given('a feature that is off', () => {
    when('a causal aws error is provided (the read path)', () => {
      const error = getCostExplorerPreferenceGuidanceError({
        feature: 'rightsizeRecommendations',
        awsError: new Error(
          'Rightsizing EC2 recommendation is an opt-in only feature.',
        ),
      });

      then('it is a BadRequestError', () => {
        expect(error).toBeInstanceOf(BadRequestError);
      });

      then('it names the declared resource to provision', () => {
        expect(error.message).toContain('DeclaredAwsCostExplorerPreference');
      });

      then(
        'it carries the console guidance + metadata (message snapshot)',
        () => {
          expect(error.message).toMatchSnapshot();
        },
      );

      then('the message cites the payer Cost Explorer Preferences url', () => {
        expect(error.message).toContain(
          'console.aws.amazon.com/cost-management',
        );
      });
    });

    when('no causal aws error is provided (the set path)', () => {
      const error = getCostExplorerPreferenceGuidanceError({
        feature: 'rightsizeRecommendations',
      });

      then('it still guides + cites the resource', () => {
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('DeclaredAwsCostExplorerPreference');
      });
    });
  });
});
