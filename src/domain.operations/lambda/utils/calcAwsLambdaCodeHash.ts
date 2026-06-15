import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import type { Hash } from 'hash-fns';
import { isHashSha256 } from 'hash-fns';
import { resolve } from 'path';

/**
 * .what = computes sha256 hash of lambda code zip file
 * .why = declastruct uses code hash to detect changes
 * .how = reads zip file from zipUri and computes hex-encoded sha256
 */
export const calcAwsLambdaCodeHash = (input: {
  of: { zipUri: string };
}): Hash => {
  // read the zip file
  const zipBuffer = readFileSync(resolve(input.of.zipUri));

  // compute sha256 hash as hex (hash-fns format)
  const hexHash = createHash('sha256').update(zipBuffer).digest('hex');

  // validate and cast to Hash type
  return isHashSha256.assure(hexHash);
};
