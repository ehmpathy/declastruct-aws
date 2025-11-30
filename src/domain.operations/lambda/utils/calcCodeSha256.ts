import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { DeclaredAwsLambda } from '../../../domain.objects/DeclaredAwsLambda';

/**
 * .what = computes sha256 hash of lambda code zip file
 * .why = aws uses code sha256 for version identity
 * .how = reads zip file from codeZipUri and computes base64-encoded sha256
 */
export const calcCodeSha256 = (input: { of: DeclaredAwsLambda }): string => {
  // read the zip file
  const zipBuffer = readFileSync(resolve(input.of.codeZipUri));

  // compute sha256 hash and return as base64 (AWS format)
  return createHash('sha256').update(zipBuffer).digest('base64');
};
