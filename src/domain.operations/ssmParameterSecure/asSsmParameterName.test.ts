import { given, then, when } from 'test-fns';

import { asSsmParameterName } from './asSsmParameterName';

const arn =
  'arn:aws:ssm:us-east-1:123456789012:parameter/svc-notifications/prod/twilio/auth-token';
const name = '/svc-notifications/prod/twilio/auth-token';

describe('asSsmParameterName', () => {
  given('[case1] a unique key (name)', () => {
    when('[t0] derived', () => {
      then('returns the name unchanged', () => {
        expect(asSsmParameterName({ by: { unique: { name } } })).toEqual(name);
      });
    });
  });

  given('[case2] a primary key (arn)', () => {
    when('[t0] derived', () => {
      then('strips the arn prefix down to the parameter path', () => {
        expect(asSsmParameterName({ by: { primary: { arn } } })).toEqual(name);
      });
    });
  });

  given('[case3] a ref that is a unique key', () => {
    when('[t0] derived', () => {
      then('returns the name unchanged', () => {
        expect(asSsmParameterName({ by: { ref: { name } } })).toEqual(name);
      });
    });
  });

  given('[case4] a ref that is a primary key', () => {
    when('[t0] derived', () => {
      then('strips the arn prefix down to the parameter path', () => {
        expect(asSsmParameterName({ by: { ref: { arn } } })).toEqual(name);
      });
    });
  });
});
