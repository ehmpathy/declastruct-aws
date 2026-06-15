import type { Hash } from 'hash-fns';
import { isHashSha256 } from 'hash-fns';

/**
 * .what = converts a base64-encoded sha256 hash to hex format
 * .why = AWS returns base64, hash-fns uses hex
 */
export const asHashFromBase64 = (base64: string): Hash => {
  const hexHash = Buffer.from(base64, 'base64').toString('hex');
  return isHashSha256.assure(hexHash);
};
