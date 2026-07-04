import type { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';

/**
 * .what = derives authorization state from SSH key record
 * .why = encapsulates state derivation for testability and idempotency checks
 */
export const asEc2SshKeyAuthorizedState = (input: {
  keyAuthorized: DeclaredAwsEc2SshKeyAuthorized | null;
}): 'authorized' | 'notauthorized' => {
  // if no record exists, key is not authorized
  if (!input.keyAuthorized) return 'notauthorized';

  // if record exists with fingerprint, key is authorized
  if (input.keyAuthorized.fingerprint) return 'authorized';

  // record without fingerprint = incomplete authorization
  return 'notauthorized';
};
