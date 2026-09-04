import { UnexpectedCodePathError } from 'helpful-errors';

/**
 * .what = extracts the topic name (the last arn segment)
 * .why = a by-primary get carries only the arn; the name is its final `:` segment
 */
export const asSnsTopicName = (input: { arn: string }): string =>
  input.arn.split(':').at(-1) ??
  UnexpectedCodePathError.throw('sns topic arn has no name segment', {
    arn: input.arn,
  });
