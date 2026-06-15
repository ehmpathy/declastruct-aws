import { DeclaredAwsLambdaCode } from '@src/domain.objects/DeclaredAwsLambdaCode';

import { calcAwsLambdaCodeHash } from './utils/calcAwsLambdaCodeHash';

/**
 * .what = generates DeclaredAwsLambdaCode with hash computed from zip
 * .why = convenience factory that ensures hash is always computed correctly
 */
export const genDeclaredAwsLambdaCode = (input: {
  zipUri: string;
}): DeclaredAwsLambdaCode => {
  return DeclaredAwsLambdaCode.as({
    zipUri: input.zipUri,
    hash: calcAwsLambdaCodeHash({ of: { zipUri: input.zipUri } }),
  });
};
