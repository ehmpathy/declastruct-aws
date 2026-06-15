import type { Hash } from 'hash-fns';

/**
 * .what = converts a hex-encoded sha256 hash to base64 format
 * .why = AWS expects base64 for CodeSha256 parameter
 */
export const asBase64FromHash = (hash: Hash): string => {
  return Buffer.from(hash, 'hex').toString('base64');
};
