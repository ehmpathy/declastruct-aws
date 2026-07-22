import type { DomainEntity } from 'domain-objects';

import {
  DeclaredAwsSsmParameterPlain,
  DeclaredAwsSsmParameterSecure,
} from '../../../src/contract/sdks';

/**
 * .what = a plaintext + a secret SSM parameter, to dogfood
 *   DeclaredAwsSsmParameter{Plain,Secure} against the real demo account
 * .why = proves the two new declarative param resources drive end-to-end through the
 *   demo OIDC/SSO roles:
 *   - the Plain param is value-compare — plan reads the live value via GetParameter
 *     (no kms:Decrypt needed for a String), so a changed value plans UPDATE
 *   - the Secure param is write-only — plan NEVER reads the value (metadata-only via
 *     DescribeParameters), so it stays KEEP in steady state and writes only when a
 *     value is supplied
 *
 * .how to test
 *   - FIRST create (both do not exist yet): the secret needs a value, so supply one —
 *       DECLASTRUCT_DEMO_SECRET=hunter2 \
 *         npx declastruct plan  --wish resources.ts --into .temp/plan.json
 *       npx declastruct apply --plan .temp/plan.json
 *     the plain param is created from its declared value; the secret is written from
 *     the env var (never read back).
 *   - STEADY state (both exist): leave DECLASTRUCT_DEMO_SECRET UNSET -> the secret plans
 *     KEEP (no read, no decrypt) and the plain plans KEEP (value unchanged).
 *   - ROTATE the secret: set DECLASTRUCT_DEMO_SECRET to a new value -> plan UPDATE ->
 *     apply rewrites it.
 */
export const getResourcesOfSsm = (): DomainEntity<any>[] => {
  // plaintext config — non-secret, drift by a normal value-compare
  const logLevel = DeclaredAwsSsmParameterPlain.as({
    name: '/declastruct-demo/log-level',
    value: 'info',
    description:
      'demo plaintext param — dogfood of DeclaredAwsSsmParameterPlain',
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // secret — write-only. the value is sourced from an env var so steady state is KEEP:
  //   present (env set) = create/rotate; undefined (env unset) = keep the extant value.
  // the write-only guarantee holds: plan issues no GetParameter and no kms:Decrypt.
  const apiToken = DeclaredAwsSsmParameterSecure.as({
    name: '/declastruct-demo/api-token',
    value: process.env.DECLASTRUCT_DEMO_SECRET, // undefined = keep; present = write
    keyId: null, // null = the account default aws/ssm key (no CMK needed)
    description: 'demo secret param — dogfood of DeclaredAwsSsmParameterSecure',
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  return [logLevel, apiToken];
};
