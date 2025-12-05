import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { BadRequestError } from 'helpful-errors';
import { resolve } from 'path';

import type { DeclaredAwsLambda } from '../../../domain.objects/DeclaredAwsLambda';

/**
 * .what = computes sha256 hash of lambda code zip file
 * .why = aws uses code sha256 for version identity
 * .how = reads zip file from codeZipUri and computes base64-encoded sha256
 */
export const calcCodeSha256 = (input: { of: DeclaredAwsLambda }): string => {
  // fail fast if codeZipUri is not provided
  if (!input.of.codeZipUri)
    throw new BadRequestError(
      'codeZipUri is required to calculate code sha256',
      { lambda: input.of },
    );

  // read the zip file
  const zipBuffer = readFileSync(resolve(input.of.codeZipUri));

  // compute sha256 hash and return as base64 (AWS format)
  return createHash('sha256').update(zipBuffer).digest('base64');
};
