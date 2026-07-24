import { given, then } from 'test-fns';

import { isDimensionalMonitorLimitError } from './isDimensionalMonitorLimitError';

describe('isDimensionalMonitorLimitError', () => {
  given('the live aws dimensional-monitor limit error', () => {
    then('it detects the limit signal by message', () => {
      const error = new Error(
        'Limit exceeded on dimensional spend monitor creation',
      );
      error.name = 'ValidationException';
      expect(isDimensionalMonitorLimitError({ error })).toBe(true);
    });
  });

  given('an unrelated validation error', () => {
    then('it does not match', () => {
      const error = new Error('Invalid MonitorDimension value');
      error.name = 'ValidationException';
      expect(isDimensionalMonitorLimitError({ error })).toBe(false);
    });
  });

  given('a non-error value', () => {
    then('it returns false rather than throw', () => {
      expect(isDimensionalMonitorLimitError({ error: 'nope' })).toBe(false);
      expect(isDimensionalMonitorLimitError({ error: null })).toBe(false);
    });
  });
});
