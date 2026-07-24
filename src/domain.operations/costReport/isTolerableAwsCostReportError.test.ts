import { given, then } from 'test-fns';

import { isTolerableAwsCostReportError } from './isTolerableAwsCostReportError';

describe('isTolerableAwsCostReportError', () => {
  given('[case1] the forecast allowlist (DataUnavailable only)', () => {
    const tolerable = ['DataUnavailableException'];

    then('a DataUnavailableException is tolerable', () => {
      const error = new Error('too little history');
      error.name = 'DataUnavailableException';
      expect(isTolerableAwsCostReportError({ error, tolerable })).toBe(true);
    });

    then('a GenerationExistsException is NOT tolerable for forecast', () => {
      const error = new Error('already in flight');
      error.name = 'GenerationExistsException';
      expect(isTolerableAwsCostReportError({ error, tolerable })).toBe(false);
    });

    then('an unrelated error rethrows (not tolerable)', () => {
      const error = new Error('access denied');
      error.name = 'AccessDeniedException';
      expect(isTolerableAwsCostReportError({ error, tolerable })).toBe(false);
    });
  });

  given('[case2] the purchase-plan generation allowlist (two names)', () => {
    const tolerable = ['GenerationExistsException', 'DataUnavailableException'];

    then('a GenerationExistsException is tolerable', () => {
      const error = new Error('already in flight');
      error.name = 'GenerationExistsException';
      expect(isTolerableAwsCostReportError({ error, tolerable })).toBe(true);
    });

    then('a DataUnavailableException is tolerable', () => {
      const error = new Error('too little history');
      error.name = 'DataUnavailableException';
      expect(isTolerableAwsCostReportError({ error, tolerable })).toBe(true);
    });
  });

  given('[case3] an error whose name merely PREFIXES a tolerable name', () => {
    const tolerable = ['DataUnavailableException'];

    then('the exact-name match rejects the prefix impostor', () => {
      const error = new Error('impostor');
      error.name = 'DataUnavailableExceptionExtra';
      expect(isTolerableAwsCostReportError({ error, tolerable })).toBe(false);
    });
  });
});
