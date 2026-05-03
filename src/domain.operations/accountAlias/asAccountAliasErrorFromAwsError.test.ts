import { BadRequestError, getError, HelpfulError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asAccountAliasErrorFromAwsError } from './asAccountAliasErrorFromAwsError';

describe('asAccountAliasErrorFromAwsError', () => {
  given('EntityAlreadyExistsException error', () => {
    when('transformed', () => {
      then('it throws BadRequestError with partition hint', async () => {
        const awsError = new Error('Alias already exists');
        awsError.name = 'EntityAlreadyExistsException';

        const error = await getError(() =>
          asAccountAliasErrorFromAwsError({
            error: awsError,
            alias: 'taken-alias',
            previousAlias: null,
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain("alias 'taken-alias' already in use");
        expect(error.message).toContain('partition');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('AccessDeniedException error', () => {
    when('transformed', () => {
      then('it throws HelpfulError with cause and context', async () => {
        const awsError = new Error(
          'User: arn:aws:iam::123:user/test is not authorized',
        );
        awsError.name = 'AccessDeniedException';

        const error = await getError(() =>
          asAccountAliasErrorFromAwsError({
            error: awsError,
            alias: 'my-alias',
            previousAlias: null,
          }),
        );

        expect(error).toBeInstanceOf(HelpfulError);
        expect(error.message).toContain('aws.setAccountAlias error');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('ServiceException error', () => {
    when('transformed', () => {
      then('it throws HelpfulError with cause and context', async () => {
        const awsError = new Error('Service temporarily unavailable');
        awsError.name = 'ServiceException';

        const error = await getError(() =>
          asAccountAliasErrorFromAwsError({
            error: awsError,
            alias: 'my-alias',
            previousAlias: 'old-alias',
          }),
        );

        expect(error).toBeInstanceOf(HelpfulError);
        expect(error.message).toContain('aws.setAccountAlias error');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('LimitExceededException error', () => {
    when('transformed', () => {
      then('it throws HelpfulError with cause and context', async () => {
        const awsError = new Error('Rate exceeded');
        awsError.name = 'LimitExceededException';

        const error = await getError(() =>
          asAccountAliasErrorFromAwsError({
            error: awsError,
            alias: 'my-alias',
            previousAlias: null,
          }),
        );

        expect(error).toBeInstanceOf(HelpfulError);
        expect(error.message).toContain('aws.setAccountAlias error');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('network error', () => {
    when('transformed', () => {
      then('it throws HelpfulError with cause and context', async () => {
        const networkError = new Error(
          'getaddrinfo ENOTFOUND iam.amazonaws.com',
        );
        networkError.name = 'Error';

        const error = await getError(() =>
          asAccountAliasErrorFromAwsError({
            error: networkError,
            alias: 'my-alias',
            previousAlias: null,
          }),
        );

        expect(error).toBeInstanceOf(HelpfulError);
        expect(error.message).toContain('aws.setAccountAlias error');
        expect(error).toMatchSnapshot();
      });
    });
  });
});
