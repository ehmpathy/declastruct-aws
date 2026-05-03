import { BadRequestError, getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { validateAccountAliasFormat } from './validateAccountAliasFormat';

describe('validateAccountAliasFormat', () => {
  given('a valid alias', () => {
    when('validated', () => {
      then('it should return valid: true', () => {
        const result = validateAccountAliasFormat({ alias: 'ehmpathy-demo' });
        expect(result).toEqual({ valid: true });
      });
    });
  });

  given('a valid alias with numbers', () => {
    when('validated', () => {
      then('it should return valid: true', () => {
        const result = validateAccountAliasFormat({ alias: 'abc123def' });
        expect(result).toEqual({ valid: true });
      });
    });
  });

  given('an alias that is too short', () => {
    when('validated', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(() =>
          validateAccountAliasFormat({ alias: 'ab' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('invalid account alias format');
        expect(error.message).toContain('must be 3-63 characters');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('an alias that is too long', () => {
    when('validated', () => {
      then('it should throw BadRequestError', async () => {
        const longAlias = 'a'.repeat(64);
        const error = await getError(() =>
          validateAccountAliasFormat({ alias: longAlias }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('must be 3-63 characters');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('an alias with uppercase letters', () => {
    when('validated', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(() =>
          validateAccountAliasFormat({ alias: 'UPPERCASE' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain(
          "invalid account alias format: 'UPPERCASE'",
        );
        expect(error.message).toContain(
          'must contain only lowercase letters, numbers, and hyphens',
        );
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('an alias with consecutive hyphens', () => {
    when('validated', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(() =>
          validateAccountAliasFormat({ alias: 'ehmpathy--demo' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('must not contain consecutive hyphens');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('an alias that starts with hyphen', () => {
    when('validated', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(() =>
          validateAccountAliasFormat({ alias: '-ehmpathy' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain(
          'must start with alphanumeric character',
        );
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('an alias that ends with hyphen', () => {
    when('validated', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(() =>
          validateAccountAliasFormat({ alias: 'ehmpathy-' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('must end with alphanumeric character');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('an alias with invalid characters', () => {
    when('validated', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(() =>
          validateAccountAliasFormat({ alias: 'ehmpathy_demo' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain(
          'must contain only lowercase letters, numbers, and hyphens',
        );
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('an alias with multiple violations', () => {
    when('validated', () => {
      then('it should list all violations', async () => {
        // starts with hyphen, ends with hyphen, consecutive hyphens
        const error = await getError(() =>
          validateAccountAliasFormat({ alias: '-a--b-' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('must start with alphanumeric');
        expect(error.message).toContain('must end with alphanumeric');
        expect(error.message).toContain('must not contain consecutive hyphens');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('boundary cases', () => {
    when('alias is exactly 3 characters', () => {
      then('it should be valid', () => {
        const result = validateAccountAliasFormat({ alias: 'abc' });
        expect(result).toEqual({ valid: true });
      });
    });

    when('alias is exactly 63 characters', () => {
      then('it should be valid', () => {
        const result = validateAccountAliasFormat({ alias: 'a'.repeat(63) });
        expect(result).toEqual({ valid: true });
      });
    });
  });
});
