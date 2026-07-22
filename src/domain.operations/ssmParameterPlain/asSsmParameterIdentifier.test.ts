import { given, then, when } from 'test-fns';

import { asSsmParameterIdentifier } from './asSsmParameterIdentifier';

const arn =
  'arn:aws:ssm:us-east-1:123456789012:parameter/svc-notifications/prod/log-level';
const name = '/svc-notifications/prod/log-level';

describe('asSsmParameterIdentifier', () => {
  given('[case1] a unique key (name)', () => {
    when('[t0] derived', () => {
      then('returns the name', () => {
        expect(asSsmParameterIdentifier({ by: { unique: { name } } })).toEqual(
          name,
        );
      });
    });
  });

  given('[case2] a primary key (arn)', () => {
    when('[t0] derived', () => {
      then('returns the arn unchanged (GetParameter accepts an arn)', () => {
        expect(asSsmParameterIdentifier({ by: { primary: { arn } } })).toEqual(
          arn,
        );
      });
    });
  });

  given('[case3] a ref that is a unique key', () => {
    when('[t0] derived', () => {
      then('returns the name', () => {
        expect(asSsmParameterIdentifier({ by: { ref: { name } } })).toEqual(
          name,
        );
      });
    });
  });

  given('[case4] a ref that is a primary key', () => {
    when('[t0] derived', () => {
      then('returns the arn unchanged', () => {
        expect(asSsmParameterIdentifier({ by: { ref: { arn } } })).toEqual(arn);
      });
    });
  });
});
